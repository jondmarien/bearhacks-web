/**
 * Resolves the base URL of the participant portal (`me.bearhacks.com`) from
 * the perspective of the admin app. Used to build cross-app links such as
 * "View profile" / printed QR claim URLs.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_ME_URL` env override (trimmed, no trailing slash).
 *  2. Local dev (`localhost` / `127.0.0.1`) → `http://localhost:3000`.
 *  3. Production heuristic: swap `admin.` → `me.` on the current origin.
 *  4. Fallback to `https://me.bearhacks.com`.
 */
export function resolveMeBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ME_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { origin } = window.location;
    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1")
    ) {
      return "http://localhost:3000";
    }
    if (origin.includes("admin.")) {
      return origin.replace("admin.", "me.");
    }
  }
  return "https://me.bearhacks.com";
}
