# Operations and maintenance

## Supported operating model

One Next.js Node 26 LTS server uses SQLite through pinned `better-sqlite3`. No external account, database service or credential is required for local operation. The production startup script resolves the default `.data/fengi.sqlite` path outside `.next/standalone`, so rebuilding does not replace progress. `FENGI_DATABASE_PATH` overrides it with an absolute path. Use a persistent **local** disk with restrictive ownership, adequate free space and backup storage; do not put the live WAL database on a network filesystem or an ephemeral serverless volume.

This is not a claim of enterprise launch readiness, horizontal scalability, high availability or a service-level guarantee. There is no email/account identity, trusted competitive ranking, managed monitoring or provisioned deployment. Do not add multiple independent SQLite volumes behind a load balancer: users would see divergent profiles. PostgreSQL (with equivalent transactional revision semantics) is the next step when shared multi-host writes are required.

## Runtime and security configuration

Set `FENGI_ORIGIN` to the exact public HTTPS origin behind a reverse proxy. Mutations require matching Origin, JSON content type and an application header; forwarded headers are deliberately not trusted. Without this setting, direct local access uses the request Host and protocol. The configured HTTPS origin enables Secure cookies; session cookies are always HttpOnly, SameSite=Strict and expire after 180 days. Terminate TLS at the approved host/proxy and reject unknown hosts there. Apply ingress request/connection limits and timeouts, process restarts, OS patching and disk alerts. A deployment destination and its access credentials remain necessary before deployment; none were supplied or provisioned.

The public save API limits bodies to 32 KiB, validates session identity and frozen game invariants, and recomputes summaries/completion. Each profile has a 300-request/minute shared SQLite budget. Profile creation has a global 120/minute limit and a 10,000-profile capacity guard; recovery attempts have a global 60/minute limit. These bounds limit growth but are not a distributed abuse/DDoS solution. At public scale, add ingress abuse controls and define retention/capacity policy before raising limits. All SQL uses bound values. Errors omit exception bodies and credentials. No client code receives the NVIDIA key.

The server stores hashes of random 256-bit session and recovery capabilities, not their plaintext values. A recovery code grants profile access, works once and is replaced when a new code is generated. Recovery creates another session (at most ten per profile); it does not revoke other valid devices. Deleting a profile cascades to all its sessions and saves. Invalid/expired cookies do not silently create a replacement profile. Restore using a recovery code, or clear the expired cookie deliberately to start over. Profile switching binds each write to its original profile ID so an old editor cannot write into the newly recovered profile.

## Save consistency and versions

Each write carries the expected server revision and a unique mutation ID. The SQLite transaction increments the revision or returns 409 if another writer won; retrying the same last mutation returns its previous result. This is single-record compare-and-swap, not game-event merging. Profile IDs are unguessable identifiers, but authorization always comes from the session cookie.

Web Locks give one editor per game session across browser tabs. Without Web Locks, server revision checks still reject stale writes. Other games use independent browser cache keys. The cache keeps recent confirmed records and retains pending records for recovery, subject to browser quota. An offline edit is stored locally and retried on reconnect or every 30 seconds while the page remains open. A network acknowledgement lost during concurrent edits can require manual conflict recovery. The conflict screen preserves a downloadable local copy and offers an explicit load-server-copy action. Never silently overwrite a newer server save. Clearing cookies/cache without keeping a recovery code can lose access; there is no email recovery.

Server history is capped at 60 sessions per profile. The browser displays its 60 most recent records; pending older records may stay cached until synced or explicitly cleared. The local JSON export is for player-controlled backup and inspection; an arbitrary JSON import is not currently exposed. Existing browser-only v1 saves load and import when played. Export before switching profiles if there are unsynced edits.

Rule versions are separate from envelope and database schema versions. `gameReleases` defines current versions and daily activation dates. Views, engines, content, validators and PRNG behavior for v1 are retained explicitly. Resume links carry a version, and unknown versions cannot load or overwrite a save. When adding v2, retain v1 code, add a validator/loader and activation date, and test old-save fixtures. Never edit the historical catalogue or generator under the same rule version. The database currently has schema version 1; startup refuses a newer schema. Future migrations must be transactional, forward-versioned and tested against backups. Do not promise downgrade compatibility with newer schemas.

## Backups and tested restoration

The driver runs WAL with FULL synchronous commits and a five-second busy timeout. The database file is created mode 0600; its directory is 0700 when newly created. Verify permissions on an existing mounted directory and encrypt storage/backups according to deployment requirements. No encryption key is provisioned by this app.

1. Run `npm run db:backup -- /secure/backups/fengi-YYYYMMDD.sqlite`. This uses SQLite's online backup API, not a copy of a live WAL file. Use the same database path/environment as the app.
2. Run `npm run db:verify -- /secure/backups/fengi-YYYYMMDD.sqlite`. It opens read-only, checks SQLite integrity and the supported schema.
3. Test a restore on an isolated server using a copy of that verified backup and a different `FENGI_DATABASE_PATH`; verify health and saved-state recovery. Automated tests cover close/reopen, backup restore, credentials and revision persistence.
4. For an actual recovery, stop writers, preserve the entire failed database directory (including WAL/SHM sidecars), restore the verified backup into a **new directory**, set ownership/permissions, point `FENGI_DATABASE_PATH` there, and start the app. Do not overwrite an active database or mix old sidecars with a restored file.
5. Verify readiness, a known saved game and recovery access. Data written after the backup is not in the restored copy. Retain the failed directory for diagnosis; never delete it as part of the automatic restore procedure.

An operator must schedule backups, choose encrypted off-host storage, retention, recovery-point/time objectives and conduct periodic restoration drills. These are infrastructure responsibilities, not completed hosted services. Backups contain game answers and hashed credentials; restrict access. Profile deletion removes live records immediately; backup expiry must follow the chosen retention/privacy policy. Restoring an old backup can restore deleted profiles, so reconcile deletion records before reopening a restored production service. A durable off-host deletion journal is not implemented.

## Health and observability

`GET /api/health` checks database readability and reports `persistence: ready`; failure returns 503 without paths or secrets. It is a readiness signal, not a deep integrity or end-to-end write check. Put it behind host monitoring with restart/backoff policies; alert on sustained 503s, disk capacity and backup age. Database corruption/permission failures are not automatically repaired or replaced with an empty file.

API requests emit structured JSON with route name, status, duration and request ID. Responses include the same request ID. Logs deliberately exclude cookies, recovery codes, profile IDs, free-form answers and exception bodies. Monitor 5xx rates, 409 conflicts, 429 budget exhaustion and latency percentiles. No logs are exported to a third party by the application. Host/proxy logs may capture request URLs; never put credentials in URLs. Review failure traces before sharing: browser test traces can contain test recovery codes and game data.

## Content and release safety

LangChain/NVIDIA authoring remains an operator CLI, with no public inference endpoint. `NVIDIA_API_KEY` is server-only; generation is disabled by default. Requests have a 15-second timeout, 20-second abort and at most one retry. Invalid output/provider failures return reviewed deterministic categories. A real key, authorized provider access and production/model rights review remain necessary for live verification. Odd Answer v1 contains eight curated categories; new content requires a new rule edition when it changes historical puzzles.

CI runs lint, types, engine/version/save/database tests, dependency audit, production build and desktop/mobile browser flows including recovery, concurrent tabs, API boundaries and network interruptions. Before public launch: real Safari/Android and screen-reader review, device/load profiling, host-specific CSP/TLS/security review, editorial rights review, retention/privacy policy and backup/restore drills. No merge or deployment was performed; the old Alchemy Arena Pages workflow remains manual-only.

Keep immutable artifacts tagged with commit IDs and a verified backup before schema changes. Roll back only to an application compatible with the active database and rule versions. Existing default-branch dependency alerts for the preserved legacy project are separate from the root app audit and remain release work.
