# Reviewed AI collections

Fengi uses AI for short titles, descriptions and selection of three existing Odd Answer categories. It does not invent facts, answer lists, scores or rarity statistics. The collection is consumed by a real v1 practice game: publication binds the selected categories to a reproducible seed, so canonical answer judging, server-side save validation, offline progress and recovery remain unchanged. Daily historical editions are never repointed. Collections with the same ordered category selection intentionally share a practice session.

## Operator workflow

Run the CLI on a trusted operator machine with Node 26 and `npm ci`. It has no HTTP counterpart and requires filesystem access to the editorial database. Use `FENGI_EDITORIAL_PATH` to select the database used by the web process. Do not expose its file, WAL, backups or CLI through a static file server.

Before production generation, obtain approval for the provider service and exact model's terms, and record the non-secret approval reference as `FENGI_AI_RIGHTS_REFERENCE`. A reference is an operator attestation, not an automated license check or a grant of rights. The NVIDIA model page distinguishes API trial terms from deployment terms; a working key does not establish commercial rights. See the [NVIDIA model card](https://build.nvidia.com/mistralai/mistral-large-4-1t-a52b/modelcard). Do not put credentials in this field.

1. Set `NVIDIA_API_KEY` securely, `NVIDIA_MODEL`, optional `NVIDIA_REASONING_EFFORT`, and the rights reference. Do not enable LangSmith tracing for this workflow without a separate data-sharing decision.
2. `npm run content:editorial -- generate` creates a draft with model/source provenance and prints only its ID, digest, source and reason. Provider failure creates a clearly labeled deterministic draft, never fake AI success. Each command generates at most one draft, with bounded provider retries.
3. `npm run content:editorial -- review ID` explicitly displays the draft, category IDs, source, model, rights reference and SHA-256 digest. Check accuracy, tone, safety, suitability for children, accessibility, originality and applicable usage rights. Inspect every character; schema validation is not content moderation. No generated HTML is rendered.
4. `npm run content:editorial -- approve ID DIGEST REVIEWER` attests that the exact draft was reviewed. There is no automatic approval.
5. `npm run content:editorial -- publish ID DIGEST PUBLISHER` makes the approved edition visible at `/collections`. Open it and play all three rounds. Publication never changes v1 rules.
6. `npm run content:editorial -- revoke ID DIGEST OPERATOR` removes a published collection from discovery. Existing practice saves still load via their stable seed. Revoked entries cannot be silently republished.

Approve/publish/revoke record timestamped events and the reviewed digest in SQLite. Draft content is immutable in this interface. Create a new draft to revise text. Digest mismatches, invalid transitions and corrupted content fail closed. Public reads show only published editions and do not send rights/reviewer/model metadata to the client. Storage failure falls back to the existing curated games. Public discovery currently shows the latest 24 editions.

The CLI assumes trusted filesystem operators; the reviewer name is an attestation, not authenticated SSO. It is not a two-person enforcement system or tamper-proof audit service. A production editorial team needs authenticated operator access, off-host audit retention, approval policy, quota controls, moderation policy and incident procedures.

## Verification and backups

`npm run content:verify-live` calls the actual editorial prompt twice, rejects fallback, revalidates categories and prints status/counts only. It neither persists nor publishes generated prose. Unit/browser fixtures use original deterministic content and never claim model generation.

Back up `FENGI_EDITORIAL_PATH` using SQLite's online backup API (not a raw copy of a running WAL database). Keep that snapshot with progress database backups. Restore only while authoring and the web process are stopped, verify SQLite integrity, and check all published digests before reopening. Encryption, off-host backup transfer and restoration scheduling are operator responsibilities; no automatic backup destination is configured.

`npm run content:verify-play` additionally generates two real drafts and runs desktop/mobile Chromium sessions against a loopback-only server. It uses a temporary private database, simulates approval transitions with explicitly automated-test actors, completes all three rounds and reloads results, then removes the database. This is not human review or external publication. Run `npm run build` and install Playwright Chromium first; port 3187 must be free. The command never records screenshots or generated text.

## Paired backup and restore

`npm run db:backup -- /absolute/new-bundle-directory` now creates both `progress.sqlite` and `editorial.sqlite`, verifies integrity/schema and every editorial body digest, then writes `complete.json` last. The destination must not exist. Failed/incomplete bundles are retained for diagnosis and must not be restored. `npm run db:verify -- BUNDLE` requires the completion marker and verifies both files. Legacy single-file progress backups remain historical progress-only snapshots; they cannot recover collections.

Snapshots use SQLite's online backup API and are individually consistent. They are sequential, not a distributed transaction. For a coordinated recovery point, stop web and editorial writers before backup and keep them stopped through completion. Otherwise concurrent changes can fall on different sides of the two snapshot times. There is no automatic retention or deletion: operators must retain complete pairs together, encrypt and copy them off-host, and choose a retention policy that preserves required history.

`npm run db:restore -- BUNDLE NEW_DIRECTORY` verifies a complete bundle, copies both databases into an exclusively created directory, and verifies the restored files. It never overwrites live data. Stop every writer, preserve the existing databases and WAL files, switch both `FENGI_DATABASE_PATH` and `FENGI_EDITORIAL_PATH` to the restored absolute paths, then restart and exercise recovery and published collections. Do not copy old WAL/SHM files into the restored directory. A failed restore directory is incomplete and must not be activated. Restore rehearsal, off-host transport and atomic runtime configuration changes remain operator responsibilities.

AI currently writes short prose and selects three categories from eight curated Odd Answer categories. It does not generate unlimited verified answers or power the other four games.

## Generated route gardens

`generate-garden` additionally requests an original 6×6 route layout from the configured NVIDIA model. Strict validation bounds cells and wall count, requires three distinct seeds, rejects overlaps and duplicate stored layouts, and computes a complete orthogonal collect-and-exit route with the trusted solver. The model cannot supply its own proof or score. Failed generation returns labeled deterministic content without a garden. Exact-layout deduplication does not detect every symmetric or strategically similar layout.

Gardens are immutable parts of the reviewed digest and require the same rights reference and approval/publication workflow. Published collection pages link to a semantic-button practice board. Completion uses actual player moves and a recomputed shortest route. This separate challenge is not a replacement for the versioned daily Trail Trace engine: it currently has no server save, reload recovery, ranked score, Phaser presentation or keyboard arrow shortcuts. Keyboard Tab/Enter controls are available. Prose still requires human safety/originality review; solvability does not establish fun or commercial rights.

The live verifier now requests two gardens, validates actual NVIDIA output, simulates local-only approval, and completes each generated board in desktop/mobile browsers in addition to the Odd Answer sessions. AI coverage is limited to editorial prose/category selection and this generated route challenge. It does not power all games or generate verified answer banks.
