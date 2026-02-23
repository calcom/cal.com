import { getApiKey, getApiUrl } from "./config";

interface ApiRequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  status: string;
  data?: T;
  error?: { message: string; code?: string };
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const apiUrl = getApiUrl();
  const apiKey = getApiKey();
  const { method = "GET", body, query, headers = {} } = options;

  let url = `${apiUrl}${path}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          params.append(key, v);
        }
      } else {
        params.append(key, value);
      }
    }
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const fetchHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "cal-api-version": "2024-08-13",
    ...headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
  };

  if (body && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = `HTTP ${response.status} ${response.statusText}`;
    }
    try {
      const parsed = JSON.parse(errorBody) as { message?: string; error?: string };
      const message = parsed.message || parsed.error || errorBody;
      throw new Error(`API Error (${response.status}): ${message}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("API Error")) {
        throw e;
      }
      throw new Error(`API Error (${response.status}): ${errorBody}`);
    }
  }

  return (await response.json()) as ApiResponse<T>;
}
