# Alchemy Arena — component inventory (Step 1)

> **Source note:** the approved "Fusion Prototype" design project could not be
> fetched from this environment (auth-gated design MCP). This inventory lists the
> recurring components named in spec v2 and the implementation brief, with states
> inferred from the spec. **Reconcile against the design exports before visual
> sign-off**; contradictions found then must be flagged, not silently resolved.
> No contradiction between brief and spec has been observed so far — the open
> risk is only *unverified visuals*, tracked here.

All components style exclusively via `tokens.css` custom properties (spec §7c).

| Component | What it is | States | Appears on |
|---|---|---|---|
| **Specimen seal** | Seeded canvas sigil (rings/spokes/glyph marks) with centered monochrome Noto Emoji; brass on obsidian (§7e, 64-bit hash) | default · selected (brass glow) · fainted (desaturated, 40% opacity) · undiscovered (silhouette "?") · first-discovery (ribbon corner) | Workbench, squad picker, battle field, codex grid, share/verdict card |
| **Move card** | Move name, type chip, category icon (physical/special/status), power/accuracy/PP in mono | default · hover/focus · selected · disabled (0 PP) · super-effective hint (brass edge) | Battle action bar, specimen detail, craft result |
| **Ink-ring HP** | Circular HP indicator drawn as an ink ring around the active seal; drains counter-clockwise | healthy (victory green) · wounded (warn brass, ≤50%) · critical (defeat red, ≤20%) · statused (status-purple tick) | Battle field (both actives), squad strip |
| **Verdict card** | Post-battle summary: result banner, both squads as mini seals, turn count, commentator quote | victory · defeat · draw/boss-repelled | End of battle, daily boss result |
| **Share grid** | Emoji grid (result row + squad rows + turn count) rendered as copyable text block, mono font | preview · copied (confirmation flash) | Verdict card, daily boss result |
| **Streak wax seal** | Round wax-seal stamp per day; brass = played, freeze-blue = freeze spent, empty ring = missed | filled · freeze · missed · today (pulsing ring) | Daily screen header, profile |
| **Quest ribbon** | Horizontal ribbon listing a quest, progress fraction in mono, reward stamp | active · progress-updated · complete (claimable, brass glow) · claimed | Daily screen, home |
| **Codex grid cell** | Compact seal + name + type chips; grid of all discovered specimens | discovered · undiscovered (silhouette) · new (dot badge) · first-discovery (credit line) | Codex screen |
| **Lineage branch** | Tree edge showing parent-pair → child fusion, small seals as nodes | default · highlighted path · collapsed | Specimen detail (lineage tab), codex |
| **Type chip** | Small rounded tag with type name | per-type tint over obsidian · muted (in lists) | Move card, codex cell, craft result, battle log |
| **Battle log line** | Mono-font event line; commentator lines in italic UI font under it | normal · effective/critical (brass) · status (purple) · faint (red) | Battle screen log pane |
| **Weekly-modifier banner** | Slim banner naming the week's arena rule | default · new-this-week (glow) | Home, battle setup |
| **Boss poster** | Daily boss presentation: oversized seal, name in Fraunces, defeated stamp | fresh · attempted · defeated (stamp) | Daily screen |
| **Craft bench slots** | Two input slots + fuse button; result reveal animation into a seal | empty · filled · fusing (spinner sigil) · reveal · error-fallback (subtle note) | Workbench |
| **First-discovery toast** | Toast crediting the discoverer ("First discovered by …") | own-discovery (celebratory) · known-recipe (credit line) | Workbench after fuse |
