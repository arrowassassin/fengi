import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getStore, StoreError } from "./store";
export const COOKIE = "fengi_session";
function publicOrigin(request: Request) {
  // Next's internal request URL can use the bind hostname. Never trust forwarded headers.
  return (
    process.env.FENGI_ORIGIN ||
    `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`
  );
}
export async function profile() {
  const id = getStore().identify((await cookies()).get(COOKIE)?.value);
  if (!id)
    throw new StoreError(
      401,
      "Your server session has expired. Use your recovery code or start a new profile.",
    );
  getStore().limit(`profile:${id}`, 300);
  return id;
}
export async function setSession(secret: string, request: Request, days = 180) {
  const origin = publicOrigin(request);
  (await cookies()).set(COOKIE, secret, {
    httpOnly: true,
    sameSite: "strict",
    secure: origin.startsWith("https:"),
    path: "/",
    maxAge: days * 86400,
  });
}
export async function readBody(request: Request): Promise<unknown> {
  const origin = publicOrigin(request);
  if (request.headers.get("origin") !== origin || request.headers.get("x-fengi-client") !== "1")
    throw new StoreError(403, "Request origin is not allowed.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new StoreError(415, "JSON is required.");
  if (Number(request.headers.get("content-length")) > 32768)
    throw new StoreError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new StoreError(400, "Request body is missing.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) throw new StoreError(413, "Request is too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new StoreError(400, "Invalid JSON.");
  }
}
export async function respond(route: string, run: () => Promise<unknown>): Promise<Response> {
  const requestId = randomUUID(),
    start = Date.now();
  let status = 200;
  let body: unknown;
  try {
    body = await run();
  } catch (error) {
    status = error instanceof StoreError ? error.status : 503;
    body = {
      error:
        error instanceof StoreError
          ? error.message
          : "Progress service is unavailable. Your local copy is kept.",
      requestId,
    };
  }
  // Deliberately omit tokens, cookies, profile IDs, answers, URLs and exception bodies.
  console.info(
    JSON.stringify({
      event: "api_request",
      route,
      status,
      durationMs: Date.now() - start,
      requestId,
    }),
  );
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Request-ID": requestId,
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}

export async function renewSession(request: Request) {
  const secret = (await cookies()).get(COOKIE)?.value;
  if (secret) await setSession(secret, request);
}
