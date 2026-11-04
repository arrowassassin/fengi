"use client";
import type Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import type { ScenePicture } from "./contracts";

/** One disposable Phaser scene per mounted board. React retains semantic input and saved state. */
export function PhaserSurface({
  picture,
  children,
  onFrame,
  game,
}: {
  picture: ScenePicture;
  children: React.ReactNode;
  onFrame?: (deltaMs: number) => void;
  game: string;
}) {
  const root = useRef<HTMLDivElement>(null),
    host = useRef<HTMLDivElement>(null),
    latest = useRef({ picture, onFrame });
  latest.current = { picture, onFrame };
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false,
      instance: Phaser.Game | undefined,
      fallback = 0,
      last = 0,
      dirty = true,
      previous: ScenePicture | undefined;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const resized = () => {
      dirty = true;
    };
    const resize = new ResizeObserver(resized),
      theme = new MutationObserver(resized);
    if (root.current) resize.observe(root.current);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    motion.addEventListener("change", resized);
    const fallbackLoop = (now: number) => {
      if (disposed) return;
      if (last && !document.hidden) latest.current.onFrame?.(Math.min(now - last, 100));
      last = now;
      fallback = requestAnimationFrame(fallbackLoop);
    };
    const fail = () => {
      if (disposed) return;
      setReady(false);
      setFailed(true);
      instance?.loop.sleep();
      if (!fallback) fallback = requestAnimationFrame(fallbackLoop);
    };
    async function start() {
      try {
        const imported = await import("phaser");
        const P = imported.default ?? imported;
        if (disposed || !host.current || !root.current) return;
        class BoardScene extends P.Scene {
          nodes = new Map<
            string,
            {
              container: Phaser.GameObjects.Container;
              box: Phaser.GameObjects.Graphics;
              text: Phaser.GameObjects.Text;
              value: string;
            }
          >();
          arena?: Phaser.GameObjects.Graphics;
          score?: Phaser.GameObjects.Text;
          caption?: Phaser.GameObjects.Text;
          create() {
            try {
              this.arena = this.add.graphics();
              this.score = this.add
                .text(0, 0, "", { fontFamily: "Georgia", fontSize: "40px" })
                .setOrigin(0.5);
              this.caption = this.add
                .text(0, 0, "", { fontFamily: "Arial", fontSize: "10px" })
                .setOrigin(0.5);
              this.paint();
              if (!disposed) setReady(true);
            } catch {
              fail();
            }
          }
          paint() {
            const element = root.current;
            if (!element) return;
            const bounds = element.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return;
            if (
              this.scale.width !== Math.round(bounds.width) ||
              this.scale.height !== Math.round(bounds.height)
            )
              this.scale.resize(Math.round(bounds.width), Math.round(bounds.height));
            const style = getComputedStyle(document.documentElement);
            const css = (token: string) =>
              token.startsWith("--") ? style.getPropertyValue(token).trim() : token;
            const color = (token: string) => P.Display.Color.HexStringToColor(css(token)).color;
            const picture = latest.current.picture;
            const live = new Set<string>();
            for (const node of picture.nodes) {
              const semantic = element.querySelector<HTMLElement>(`[data-scene-id="${node.id}"]`);
              if (!semantic) continue;
              live.add(node.id);
              const rect = semantic.getBoundingClientRect(),
                font = getComputedStyle(semantic),
                x = rect.left - bounds.left,
                y = rect.top - bounds.top;
              let item = this.nodes.get(node.id);
              if (!item) {
                const box = this.add.graphics(),
                  text = this.add.text(0, 0, "", {
                    fontFamily: font.fontFamily,
                    fontSize: font.fontSize,
                    align: "center",
                  });
                item = {
                  container: this.add.container(0, 0, [box, text]),
                  box,
                  text,
                  value: node.text,
                };
                this.nodes.set(node.id, item);
              }
              const changed = item.value !== node.text;
              item.value = node.text;
              item.container.setPosition(x, y).setAlpha(node.opacity ?? 1);
              item.box.clear();
              if (node.shape !== "text") {
                item.box
                  .fillStyle(color(node.fill ?? "--panel"), 1)
                  .fillRoundedRect(
                    1,
                    1,
                    rect.width - 2,
                    rect.height - 2,
                    Math.min(12, rect.width / 5),
                  );
                item.box
                  .lineStyle(1, color("--line"), 0.6)
                  .strokeRoundedRect(
                    1,
                    1,
                    rect.width - 2,
                    rect.height - 2,
                    Math.min(12, rect.width / 5),
                  );
                if (node.fixed)
                  item.box
                    .fillStyle(color(node.color), 1)
                    .fillCircle(rect.width - 9, rect.height - 8, 1.6);
              }
              item.text
                .setText(node.text)
                .setColor(css(node.color))
                .setFontSize(font.fontSize)
                .setFontFamily(font.fontFamily)
                .setWordWrapWidth(Math.max(1, rect.width - 4), true)
                .setOrigin(0.5)
                .setPosition(rect.width / 2, rect.height / 2);
              if (changed && !motion.matches) {
                this.tweens.killTweensOf(item.container);
                item.container.setAlpha(0.45);
                this.tweens.add({
                  targets: item.container,
                  alpha: node.opacity ?? 1,
                  duration: 150,
                });
              }
            }
            for (const [id, item] of this.nodes)
              if (!live.has(id)) {
                item.container.destroy(true);
                this.nodes.delete(id);
              }
            this.arena?.clear();
            const orbit = picture.orbit;
            this.score?.setVisible(!!orbit);
            this.caption?.setVisible(!!orbit);
            if (orbit && this.arena) {
              const side = Math.min(bounds.width, bounds.height),
                scale = side / 320,
                cx = bounds.width / 2,
                cy = bounds.height / 2,
                radius = 118 * scale;
              const point = (a: number) => ({
                x: cx + Math.cos(a) * radius,
                y: cy + Math.sin(a) * radius,
              });
              this.arena.fillStyle(color("--coral"), 1).fillCircle(cx, cy, side / 2);
              this.arena
                .lineStyle(2 * scale, color("--coral-ink"), 0.4)
                .strokeCircle(cx, cy, radius);
              for (const gate of orbit.gates) {
                const p = point(gate.angle);
                this.arena
                  .fillStyle(color("--coral-ink"), gate.closed ? 1 : 0.15)
                  .fillCircle(p.x, p.y, 13 * scale);
                if (gate.closed) {
                  this.arena
                    .lineStyle(2 * scale, color("--coral"), 1)
                    .lineBetween(p.x - 4 * scale, p.y - 4 * scale, p.x + 4 * scale, p.y + 4 * scale)
                    .lineBetween(
                      p.x - 4 * scale,
                      p.y + 4 * scale,
                      p.x + 4 * scale,
                      p.y - 4 * scale,
                    );
                }
              }
              const spark = point(orbit.spark),
                player = point(orbit.angle);
              this.arena
                .fillStyle(color("--gold"), 1)
                .fillCircle(spark.x, spark.y, 9 * scale)
                .fillStyle(color("--ink"), orbit.recovering ? 0.55 : 1)
                .fillCircle(player.x, player.y, 10 * scale);
              this.score
                ?.setText(String(orbit.score))
                .setColor(css("--ink"))
                .setPosition(cx, cy - 9 * scale)
                .setFontSize(40 * scale);
              this.caption
                ?.setText(orbit.running ? "FIND YOUR RHYTHM" : "READY WHEN YOU ARE")
                .setColor(css("--coral-ink"))
                .setPosition(cx, cy + 22 * scale)
                .setFontSize(10 * scale);
            }
            element.dataset.engineFrame = String(Number(element.dataset.engineFrame ?? 0) + 1);
          }
          update(_time: number, delta: number) {
            try {
              if (disposed || document.hidden) return;
              latest.current.onFrame?.(Math.min(delta, 100));
              if (dirty || previous !== latest.current.picture) {
                dirty = false;
                previous = latest.current.picture;
                this.paint();
              }
            } catch {
              fail();
            }
          }
        }
        const size = root.current.getBoundingClientRect();
        instance = new P.Game({
          type: P.CANVAS,
          parent: host.current,
          width: Math.max(1, size.width),
          height: Math.max(1, size.height),
          transparent: true,
          banner: false,
          audio: { noAudio: true },
          input: { keyboard: false, mouse: false, touch: false },
          fps: { target: game === "orbit" ? 60 : 30 },
          scene: BoardScene,
        });
      } catch {
        fail();
      }
    }
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(fallback);
      resize.disconnect();
      theme.disconnect();
      motion.removeEventListener("change", resized);
      if (instance) {
        instance.destroy(true, false);
        // destroy is deferred until a step; a hidden/sleeping loop may never take one.
        if (instance.isBooted) instance.headlessStep(0, 0);
      }
    };
  }, [game]);
  return (
    <>
      <div
        ref={root}
        className={`phaser-surface ${ready ? "engine-ready" : ""}`}
        data-engine={ready ? "phaser" : "loading"}
        data-game={game}
      >
        <div ref={host} className="phaser-canvas" aria-hidden="true" />
        <div className="engine-semantic">{children}</div>
      </div>
      {failed && (
        <p className="notice" role="status">
          Graphics could not load. The accessible board remains available.
        </p>
      )}
    </>
  );
}
