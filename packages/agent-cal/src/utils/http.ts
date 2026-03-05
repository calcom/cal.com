/**
 * HTTP client with retries for Cal.com API v2.
 * Uses native fetch; no external HTTP dependency.
 */

const DEFAULT_BASE_URL = "https://api.cal.com";
const DEFAULT_MAX_RETRIES = 2;

export interface RequestConfig {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string; // e.g. "/v2/calendars"
  body?: unknown;
  headers?: Record<string, string>;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
}

export class AgentCalHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = "AgentCalHttpError";
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs a request to the Cal.com API with optional retries for 429/5xx.
 */
export async function request<T>(config: RequestConfig & { bearerToken: string }): Promise<T> {
  const {
    method,
    path,
    body,
    headers = {},
    baseUrl = DEFAULT_BASE_URL,
    fetchImpl = fetch,
    maxRetries = DEFAULT_MAX_RETRIES,
    bearerToken,
  } = config;

  const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path}`;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearerToken}`,
    ...headers,
  };

  let lastError: AgentCalHttpError | null = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const res = await fetchImpl(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const text = await res.text();
      let parsed: T | undefined;

      try {
        parsed = text ? (JSON.parse(text) as T) : undefined;
      } catch {
        // non-JSON response
      }

      if (!res.ok) {
        const err = new AgentCalHttpError(
          `Cal.com API error: ${res.status} ${res.statusText}`,
          res.status,
          text
        );
        if (isRetryable(res.status) && attempt < maxRetries) {
          attempt++;
          await sleep(500 * attempt);
          continue;
        }
        throw err;
      }

      return parsed as T;
    } catch (e) {
      if (e instanceof AgentCalHttpError) {
        lastError = e;
        if (isRetryable(e.status) && attempt < maxRetries) {
          attempt++;
          await sleep(500 * attempt);
          continue;
        }
        throw e;
      }
      throw e;
    }
  }

  throw lastError ?? new AgentCalHttpError("Request failed", 0);
}
