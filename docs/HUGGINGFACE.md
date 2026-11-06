# Hugging Face Spaces deployment preparation

The root README selects Docker with port 7860. The multi-stage Dockerfile builds Node 26, runs Next standalone as UID 1000, includes static assets, uses a health check and never receives credentials at build time. Build context excludes local databases, drafts, environment files and test artifacts. No Space has been created, modified or deployed by this change.

## Runtime configuration

Set these in the Space's Settings, never in source control:

| Name | Kind | Value/purpose |
| --- | --- | --- |
| `FENGI_ORIGIN` | Variable | Exact public HTTPS origin, without a trailing slash, usually `https://OWNER-SPACE.hf.space` |
| `FENGI_ADMISSION_MODE` | Variable | `shared` unless you have independently verified a trusted, overwritten single-IP ingress header |
| `FENGI_STORAGE_MODE` | Variable | Explicitly `ephemeral` for a demo, or `persistent` only with verified durable POSIX storage |
| `FENGI_DATABASE_PATH` | Variable | Absolute runtime path for progress SQLite in persistent mode |
| `FENGI_EDITORIAL_PATH` | Variable | Absolute runtime path for editorial SQLite in persistent mode |
| `NVIDIA_API_KEY` | Secret | Only needed in the separate operator authoring environment; not needed for public gameplay |
| `NVIDIA_MODEL` | Variable | Operator authoring model, currently `mistralai/mistral-large-4-1t-a52b` |
| `NVIDIA_REASONING_EFFORT` | Variable | Optional operator override; default `low` |
| `FENGI_AI_RIGHTS_REFERENCE` | Variable | Non-secret approved usage record for operator generation |

The runtime image serves published content; run generation/review/publish from the trusted Node 26 operator checkout sharing the editorial database. It deliberately has no public authoring endpoint. The local Hugging Face setup is not visible here. Before a real deployment we need the exact Space origin, storage architecture and ingress guarantees—not credential values.

In `shared` admission mode all anonymous visitors share the existing conservative creation/recovery budgets (5 creations/minute, 20/hour; invalid recovery 10/minute). This prevents spoofing forwarding headers but is suitable only for a small demo, not high traffic. Existing profiles retain their per-profile budgets. A production deployment needs a trusted ingress and abuse controls; do not guess that an arbitrary `X-Forwarded-For` chain is safe.

## Persistence and scaling limits

Current official [Spaces disk documentation](https://huggingface.co/docs/hub/en/spaces-storage) states that the runtime disk is ephemeral and recommends attached Storage Buckets. A `/data` pathname alone does not establish durability. The [Docker guide](https://huggingface.co/docs/hub/en/spaces-sdks-docker) says attached data is runtime-only and explains runtime secrets and UID 1000. The [configuration reference](https://huggingface.co/docs/hub/en/spaces-config-reference) defines README metadata.

Fengi uses SQLite WAL, file locks and a single writer. Do **not** place the live databases on an object-backed bucket mount unless the provider explicitly guarantees SQLite-compatible locking, atomic writes, fsync and WAL behavior. These guarantees have not been established here. Use buckets for completed backup snapshots, not as an assumed transactional database.

`ephemeral` mode displays a visible save-reset notice. Browser copies and explicit exports help, but server recovery codes and server-only history can be lost on restart. Do not market this mode as durable storage. `persistent` mode requires absolute paths but cannot prove the underlying mount's guarantees; the operator must verify them.

For production Spaces hosting, provide a supported durable transactional database architecture (a database service migration is not included), or a verified durable POSIX volume with one application instance. Never run independent SQLite replicas and claim shared progress. Stop all writers during restores; test WAL recovery, backup restoration, restart behavior and export/recovery flows on the actual host. Sleeping Spaces also add cold-start availability delays.

Use the direct Space origin for play: the app deliberately denies framing and uses SameSite=Strict cookies. The Hub's iframe preview is not the supported gameplay surface. Do not weaken cookie/CSRF controls just to make an embedded preview work.

## Release evidence still required

This repository is a tested single-instance application, not an enterprise-readiness certification. Outstanding gates include provider/model commercial approval, authenticated operator roles, independent security review, CSP/abuse review, real device and assistive-technology testing, load/soak tests, service-level objectives, monitoring/alerts, incident response, privacy/retention decisions, off-site backups, restoration drills and testing on the actual Space. No automatic remote deployment or migration is configured.
