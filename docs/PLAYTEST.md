# Playtest and release evidence

These are automated browser checks and AI evaluator impressions, not independent human-user research. Browser emulation is not a physical phone or a screen-reader session. No claim of enterprise readiness follows from passing tests.

## Scenarios exercised

- Signal Grid: keyboard cycling, undo, hints, reload, share fallback, completion and replay. A separate player-style scenario uses only visible row/column counts, makes deductions, and requests a hint only when stuck; it does not import the engine's solution.
- Pair Bloom: full eight-pair completion, intentional mismatch timing, reload and replay. A separate player-style scenario remembers only cards it has actually revealed, instead of inspecting the hidden deck.
- Trail Trace: visible-map route planning, all seeds, retracing, keyboard access and result feedback. Both a canonical optimum test and a visible-board-only route test are included.
- Odd Answer: invalid answers, accepted answers, scoring explanations, all three rounds and reload. Published collection selection is checked against the actual prompts shown in the game.
- Orbit Tap: start, reverse, pause, background interruption, reload paused, resume and a real terminal state. This proves control/state behavior, not expert arcade performance or calibrated difficulty.
- Persistence: anonymous profile isolation, cross-origin rejection, size limits, recovery, offline edits, stale revisions, multiple tabs, invalid rule versions and retained historical saves.
- AI: real configured NVIDIA calls through LangChain; strict final JSON parsing, fenced JSON, invalid schema, extra prose, duplicate/unknown IDs, reasoning truncation and fallback. A dedicated live-browser command creates two real drafts, simulates local-only review transitions, completes desktop/mobile play sessions and reloads saved results. Test content is removed, never externally published.
- Editorial operations: immutable draft digests, rights-reference requirement, review-before-publication, invalid transitions, tamper detection, persistent reopening and revocation without changing existing games.
- Visual/accessibility: desktop/mobile light/dark review, 320px overflow checks, keyboard focus, semantic controls behind Phaser, reduced motion, automated WCAG A/AA checks, and four committed screenshot baselines for the mascot/collection panel. Baselines protect that component, not every rendered pixel in the app.

## Evaluator observations

| Game | What works in the tested flows | Remaining playability question |
| --- | --- | --- |
| Signal Grid | Visible counts, reversible moves and a non-punitive hint make the rules understandable; completing a constrained row gives clear progress. | A novice may need an interactive example before the first grid. Test without coaching on real users. |
| Orbit Tap | One-button reversal, visible pause/resume and a short run suit quick retries; calm practice lowers the entry barrier. | Real touch latency, visual tracking and difficulty need hands-on device testing; automated survival is not evidence of fun. |
| Odd Answer | Invalid answers explain the curated-list limitation rather than claiming the player is wrong; fixed scoring is disclosed. | Eight categories limit novelty. More licensed, human-reviewed answer sets need a separately versioned release. AI titles alone do not make an infinite game. |
| Trail Trace | Collect-and-exit goals, visible obstacles and permission to retrace make experimentation low risk. | Shortest-route comparison may motivate replay, but needs player evidence; consider optional route hints after observing users. |
| Pair Bloom | Reveals, mismatch feedback and stable card positions support memory; the tested memory-based player completed the board without hidden data. | The 900ms mismatch interval may be too fast for some players. Validate with cognitive/accessibility testing before changing a frozen edition's behavior. |

Improvements delivered here: a distinctive gaming-mushroom identity with light/dark variants; a responsive collection entry point; transparent AI-assisted versus curated provenance; reviewed content that actually selects playable prompts; strict parser/fallback handling; and explicit warnings for ephemeral hosting.

## Production gates

Physical iOS/Android and desktop browser coverage, manual VoiceOver/NVDA sessions, usability sessions with independent players, sustained concurrent load, provider quota/error SLOs, production licensing, authenticated editorial roles, independent security review, real-host storage guarantees, off-host backups and restoration drills remain open. See HUGGINGFACE.md and EDITORIAL.md for hosting and operator limits.


Generated gardens additionally exercise partial interruption/reload, completion/reload, offline moves followed by reconnect/retry, server restoration after removing the browser record, and same-session two-tab locking. Actual NVIDIA-generated layouts are played, interrupted and resumed in desktop/mobile verification. Existing cross-device revision/recovery tests cover the shared persistence transport; these remain automated checks, not durability guarantees for unverified hosting storage.
