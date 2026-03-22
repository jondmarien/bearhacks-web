import { ApiError, type FastApiDetail } from "./errors";

export type GetAccessToken = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export type CreateApiClientOptions = {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export function createApiClient(options: CreateApiClientOptions) {
  const { baseUrl, getAccessToken } = options;

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    const url = path.startsWith("http") ? path : joinUrl(baseUrl, path);
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
