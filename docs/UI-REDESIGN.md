# Fengi play-club redesign

## Research and design decisions

Reviewed November 6, 2026. No frontend-design SKILL.md was present in the checkout or workspace .agents/skills. These are design inputs and evaluator observations, not independent user research or a production certification.

| Primary reference | Application to Fengi |
| --- | --- |
| [Poki: easy access and onboarding](https://developers.poki.com/guide/easy-access) | Direct launch cards, no extra splash screen, short visual rule example, portrait-first play. |
| [CrazyGames: quality guidelines](https://docs.crazygames.com/requirements/quality/) | Clear controls, skippable help, a reachable goal and feedback, without inventing player metrics or popularity. |
| [Game Accessibility Guidelines: basic](https://gameaccessibilityguidelines.com/basic/) | Keyboard/touch parity, adjustable mismatch presentation, persistent preference, non-color state indicators and reduced motion. |
| [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Main controls aim for at least 44px; spatial boards retain their grid geometry. Check narrow screens, spacing and actual rendered targets. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Visible unobscured focus, clear labels and error relationships, contrast, reflow and semantic controls. Automated checks are not a conformance certificate. |
| [Nielsen Norman Group: usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Visible save/error state, meaningful resume/completion labels, consistent navigation and reversible actions. |
| [Nielsen Norman Group: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Primary play controls stay available; rules, tutorial and recovery detail remain discoverable secondary controls. |
| [Puzzmo's current daily collection](https://www.puzzmo.com/today/) | A small, recognizable daily shelf and explicit played/unplayed states. Fengi retains its original identity and does not copy artwork or imply a social ranking service. |

The direction is a playful game club, rather than a large portal or an editorial landing page. A compact mushroom wordmark, self-hosted rounded typography, forest neutrals, bright game accents, illustrated mechanics and a small daily shelf form one visual system. On mobile, persistent bottom navigation reduces header height. On desktop, the game board sits next to help and status; small screens keep instructions concise and controls beside the board.

## Functional boundaries

- Shelf labels read this browser's saved copies and explicitly say so. They do not claim server synchronization or create anonymous profiles just to render a lobby badge. The Progress screen remains the place to inspect server recovery and synchronization.
- Pair Bloom's default 900ms reveal remains. The optional hold preference changes only reveal presentation, not deck, turns or scoring. Matched pairs remain saved; temporary selections retain their existing reload behavior.
- Signal's tutorial is a separate three-cell example and never changes the actual edition or progress. Count symbols supplement color; a matched circle count does not by itself mean every tile is filled.
- Orbit keyboard activation moves focus from Start/Resume to Reverse after the control enables. Pause stays explicit. Renderer captions and semantic state distinguish Ready, Running and Paused; gate state also appears in text/symbols.
- Trail's legal-move markers and seed checklist expose existing rules; no scoring, route or edition-generation change is intended.
- Odd Answer keeps rejected text, links field errors to the input and states the curated-list boundary. No new unverified answers are introduced.
- No generation endpoint, editorial permissions, inference model, save format or publishing policy is changed by the visual redesign.

## Verification and limits

Local verification: 67 unit tests and 80 Chromium browser tests passed, including desktop/mobile gameplay, generated-content fixtures, persistence, conflict/recovery, keyboard focus, mismatch reveal, tutorial isolation and local completion states. Eight light/dark welcome and shelf image baselines were reviewed. Automated accessibility checks passed on the covered routes. Actual deterministic play captures were produced with `npm run ui:capture -- /workspace/fengi-redesign-captures`; they are screenshots, not design mockups.

Evaluator impressions: the direct daily CTA and recognizable shelf shorten the route to play; the Signal example explains the marking cycle without risking progress, held mismatch cards remove presentation pressure, and Orbit keeps the arena and primary control together on small screens. These are evaluator judgments, not independent player evidence or a measured claim of greater fun.

Live NVIDIA verification on November 6 used the configured `mistralai/mistral-large-4-1t-a52b`, with a 120-second request timeout and 150-second overall bound. Both permitted generation attempts failed at provider-request after 150,013ms and 150,004ms, returning explicit deterministic fallback. No HTTP status was available. Neither entered approval or gameplay, and no new live-AI screenshot was produced. Earlier live passes are historical evidence, not a pass on this redesign. Next step: rerun `content:verify-play` when the configured NVIDIA endpoint responds; do not substitute a model or label fallback as AI success.

The production dependency audit reported zero vulnerabilities; paired backup, verification and restore into a new directory passed. Physical-device touch/keyboard behavior, VoiceOver/NVDA, independent usability and fun testing, sustained load and production operations remain release gates. Browser viewport emulation is not a real software-keyboard or device test. Keep commercial rights, editorial authentication and durable hosting storage requirements from OPERATIONS.md and EDITORIAL.md.

## Typography

Manrope variable Latin is self-hosted from @fontsource-variable/manrope 5.3.0, licensed OFL-1.1. The original license is retained at public/fonts/Manrope-OFL.txt. No third-party font requests occur during play or build. Source: https://www.npmjs.com/package/@fontsource-variable/manrope/v/5.3.0 .
