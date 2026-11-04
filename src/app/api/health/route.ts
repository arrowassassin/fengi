export function GET() {
  return Response.json(
    { status: "ok", app: "fengi", version: "0.1.0", schemaVersion: 1 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
