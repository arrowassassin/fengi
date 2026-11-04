import { isIP } from "node:net";
import { StoreError } from "./store";
/** Only use a header set/overwritten by the configured trusted ingress, never arbitrary forwarding chains. */
export function requestActor(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  if (!env.FENGI_ORIGIN && (env.FENGI_LOCAL_ONLY === "true" || env.NODE_ENV === "development"))
    return "local-development";
  const header = env.FENGI_CLIENT_IP_HEADER?.toLowerCase();
  if (!env.FENGI_ORIGIN || !header || !/^[a-z0-9-]+$/.test(header))
    throw new StoreError(503, "New profile admission requires a configured trusted ingress.");
  const address = request.headers.get(header)?.trim();
  if (!address || !isIP(address))
    throw new StoreError(503, "Trusted client address is unavailable.");
  if (isIP(address) === 4) return address;
  try {
    return new URL(`http://[${address}]/`).hostname;
  } catch {
    throw new StoreError(503, "Trusted client address is invalid.");
  }
}
