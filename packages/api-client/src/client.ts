import { ApiError, type FastApiDetail } from "./errors";

/** Returns a Supabase (or other) bearer token, or null if unauthenticated. */
export type GetAccessToken = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export type CreateApiClientOptions = {
  /** Absolute API origin, e.g. `https://api.bearhacks.com` or `http://127.0.0.1:8000` (no trailing slash required). */
  baseUrl: string;
  /** When set, every request adds `Authorization: Bearer <token>` when the value is non-empty. */
  getAccessToken?: GetAccessToken;
};

const localThrottleState = new Map<string, number>();

const HIGH_RISK_LOCAL_THROTTLES: Array<{
  method: string;
  matcher: RegExp;
  minIntervalMs: number;
}> = [
  { method: "POST", matcher: /^\/portal\/claim-email\/request-otp$/, minIntervalMs: 5000 },
  { method: "POST", matcher: /^\/portal\/claim-email\/verify-otp$/, minIntervalMs: 1000 },
  { method: "POST", matcher: /^\/discord\/join-guild$/, minIntervalMs: 1500 },
  { method: "POST", matcher: /^\/qr\//, minIntervalMs: 800 },
  { method: "DELETE", matcher: /^\/qr\//, minIntervalMs: 800 },
  { method: "POST", matcher: /^\/admin\//, minIntervalMs: 800 },
];

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

/**
 * Thin fetch wrapper for BearHacks FastAPI: joins `baseUrl` + path, attaches Bearer JWT, throws {@link ApiError} on non-OK JSON error bodies.
 */
export function createApiClient(options: CreateApiClientOptions) {
  const { baseUrl, getAccessToken } = options;

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    const url = path.startsWith("http") ? path : joinUrl(baseUrl, path);
    const normalizedPath = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return path;
      }
    })();
    const method = (init.method ?? "GET").toUpperCase();
    const now = Date.now();
    for (const rule of HIGH_RISK_LOCAL_THROTTLES) {
      if (rule.method !== method || !rule.matcher.test(normalizedPath)) continue;
      const key = `${method}:${normalizedPath}`;
      const last = localThrottleState.get(key) ?? 0;
      if (now - last < rule.minIntervalMs) {
        const retryAfterSeconds = Math.max(1, Math.ceil((rule.minIntervalMs - (now - last)) / 1000));
        throw new ApiError("Request throttled locally", 429, {
          code: "local_rate_limited",
          message: "You are sending requests too quickly. Please wait a moment.",
          retry_after_seconds: retryAfterSeconds,
        } as FastApiDetail);
      }
      localThrottleState.set(key, now);
      break;
    }
    const headers = new Headers(init.headers);
    const token = await Promise.resolve(getAccessToken?.());
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
  }

  async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await request(path, init);
    if (!res.ok) {
      let detail: FastApiDetail | undefined;
      try {
        const body: unknown = await res.json();
        if (
          body &&
          typeof body === "object" &&
          "detail" in body &&
          body.detail !== undefined
        ) {
          detail = body.detail as FastApiDetail;
        }
      } catch {
        detail = await res.text();
      }
      throw new ApiError(`HTTP ${res.status}`, res.status, detail);
    }
    return res.json() as Promise<T>;
  }

  return { request, fetchJson };
}
