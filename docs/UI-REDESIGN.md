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

Live NVIDIA verification on November 6 initially timed out twice at 150,013ms and 150,004ms. A later single verifier rerun used the same configured `mistralai/mistral-large-4-1t-a52b`, 120-second request timeout and 150-second overall bound. Its first attempt timed out at 150,011ms; the second returned a schema/semantically validated real NVIDIA pack at 130,144ms. Temporary local editorial records with explicitly simulated test approval powered all five games in desktop and mobile Chromium. All ten sessions reached terminal/completed results and restored after reload. Orbit terminal results can be losses; automated known-layout solving is not human playtesting. No external publication occurred; temporary databases were removed. Ten requested actual screenshots are separate from deterministic captures. The UI's ordinary human-reviewed label reflects the simulated approval transition in this test; it is not evidence of a human reviewer.

Diagnosis: authenticated model discovery returned HTTP 200 in 724ms and listed the configured model. A minimal LangChain request hit its 30,006ms bound. A minimal direct streaming completion returned HTTP 200 and first bytes at about 9,648ms but did not finish before its 30,007ms bound. NVIDIA's public status page reported Build operational, and its current model example retained this endpoint and 4,096-token budget. No adapter or dependency-lock change accompanied the redesign. The eventual unchanged-request success supports variable inference/service latency rather than a demonstrated UI or configuration regression; the exact infrastructure/account cause is unproven. Do not treat public green status as a latency guarantee. References: https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b and https://status.ngc.nvidia.com/ .

Follow-up keyboard review reproduced two defects in desktop/mobile Chromium: the legal Trail marker overrode the generic focus outline, and generated-garden arrows stopped after a move disabled the focused cell. Legal focused cells now retain an outer focus ring plus inner legal marker. Generated arrow and pointer moves focus a stable board target; regression coverage exercises consecutive arrows, Undo and reload.

The production dependency audit reported zero vulnerabilities; paired backup, verification and restore into a new directory passed. Physical-device touch/keyboard behavior, VoiceOver/NVDA, independent usability and fun testing, sustained load and production operations remain release gates. Browser viewport emulation is not a real software-keyboard or device test. Keep commercial rights, editorial authentication and durable hosting storage requirements from OPERATIONS.md and EDITORIAL.md.

## Typography

Manrope variable Latin is self-hosted from @fontsource-variable/manrope 5.3.0, licensed OFL-1.1. The original license is retained at public/fonts/Manrope-OFL.txt. No third-party font requests occur during play or build. Source: https://www.npmjs.com/package/@fontsource-variable/manrope/v/5.3.0 .
