import { DATABASE_VERSION, getStore } from "../../../server/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    getStore().ready();
    return Response.json(
      {
        status: "ok",
        app: "fengi",
        version: "0.1.0",
        schemaVersion: DATABASE_VERSION,
        persistence: "ready",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "degraded", app: "fengi", persistence: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
