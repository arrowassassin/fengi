# ADR: Phaser presentation with independent versioned game rules

Decision date: 4 November 2026. The user requests rebuilding all five games around the common engine boundary, after clarifying that long-term support means a demonstrated update history rather than a perpetual guarantee.

## Evidence before adoption

The [official stable download](https://phaser.io/download/stable) and npm `phaser/latest` both resolve to **4.2.1**, published 9 July 2026. The [official release history](https://github.com/phaserjs/phaser/releases) records stable 3.90.0 (23 May 2025), 4.0.0 (10 April 2026), 4.1.0 (30 April), 4.2.0 (19 June) and 4.2.1 (9 July), with explicit prereleases before 4.0. This shows continuing major, minor and patch work; it does not establish an LTS branch, update SLA or future maintenance commitment.

[Phaser's introduction](https://docs.phaser.io/phaser/getting-started/what-is-phaser) identifies Phaser Studio and the open-source community as maintainers, describes its decade-plus development history and its browser-focused 2D scope. Official [installation documentation](https://docs.phaser.io/phaser/getting-started/installation) provides bundled TypeScript definitions and framework templates. The [official React template](https://github.com/phaserjs/template-react) demonstrates a React/engine boundary but describes Phaser 3: it is architectural evidence, not proof of Phaser 4 compatibility. Older tutorials and installation snippets also reference 3.x, so actual 4.2.1 package types and browser behavior must be checked.

The [engine license](https://phaser.io/download/license) and package metadata identify MIT. Preserve the supplied copyright/license notice. The engine is provided without warranty; Phaser AE, editor products and third-party assets have separate terms. No commercial support contract or formal LTS promise is assumed.

## Boundary and migration

React owns routing, instructions, forms, semantic keyboard/touch controls, recovery and persistence. Phaser owns the common 2D scene lifecycle, graphical boards, visual feedback and arcade timing. Commands, deterministic rules, seeded content and serializable save state remain outside Phaser. No Phaser scene, texture, timer or display object belongs in a saved record. Rendering is replaceable without renumbering rules.

All five presentations use the shared runtime: Signal's grid, Pair Bloom's cards, Trail Trace's garden, Odd Answer's round/answer progression and Orbit's arena. Accessible DOM controls remain attached to the same authoritative state/actions; canvas is not the only way to understand or operate a turn-based game. Orbit remains a timing/visual skill game, with keyboard control, pause and calm practice, rather than a claim of equivalent nonvisual play.

Retain v1 engines, validators, content, random behavior and IDs. The rendering rewrite does not alter scoring or generated editions, so existing v1 saves need no lossy migration. Rule changes require a separately versioned release, as before. Keep NVIDIA/LangChain on the server; no key is required to play.

## Compatibility and maintenance gates

Pin 4.2.1 and its lockfile. Import it only in the browser, instantiate after mount and destroy on unmount; never access DOM/WebGL during Next server rendering. Exercise React remounts, route transitions, resize, background/foreground, reduced motion, pointer and keyboard input. Browser tests must prove all five games use the runtime and remain playable, not just that a canvas exists.

Phaser adds bundle size, GPU/browser variability and a major-version migration surface. Avoid physics/plugin dependencies when deterministic board rules do not need them. Native browser accessibility remains a React responsibility. A representative mobile/desktop test suite and pure-engine fixtures are the upgrade gate; review upstream release notes and type/API changes before changing the exact pin. Real iOS Safari/Android and low-end-device profiling remain release work. PixiJS would supply a rendering layer rather than this full game lifecycle; Three.js would add unnecessary 3D scope here. None is added merely as a future placeholder.

## Implemented runtime

The pinned engine uses its Canvas renderer for these small 2D boards; WebGL/physics are unnecessary here. Phaser owns Graphics/Text/Container display objects, visual-feedback tweens, scene resizing, and the frame clock (Orbit fixed-step simulation and Pair reveal timing). React retains native forms, focusable buttons and ARIA descriptions from the same state. The canvas is hidden from assistive technology. Dynamic browser import avoids server-rendering access to browser globals. Import/render failure keeps a usable semantic board and explicitly reports the graphics fallback.

Reduced motion disables presentation tweens. Background scenes stop advancing gameplay; Orbit explicitly pauses and saves on visibility changes. Cleanup disconnects observers, cancels fallback timers and destroys the game, including when the engine loop is sleeping. Rules commands and JSON validation live in `releases/definitions-v1.ts` and contain no Phaser imports. Existing rule versions, seeds and serialized states are preserved.

Automated checks cover actual Phaser activation in all five completion flows, canvas output changes, resize, keyboard interaction, scene navigation and Pair timing, alongside existing offline, cross-tab, recovery and accessibility checks. Chromium mobile emulation is not real-device certification. Full renderer substitution and generic real-time asset/physics adapters remain future game-specific work, not implemented features.
