import { HttpError } from "./http-error";

async function safeJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function http<T>(path: string, config: RequestInit): Promise<T | null> {
  const request = new Request(path, config);
  const response: Response = await fetch(request);

  if (!response.ok) {
    const errJson = await safeJson(response);
    const err = HttpError.fromRequest(
      request,
      {
        ...response,
        statusText: errJson?.message || response.statusText,
      },
      errJson
    );
    throw err;
  }
  // safely handles empty or non-JSON responses
  return await safeJson(response);
}

export async function get<T>(path: string, config?: RequestInit): Promise<T | null> {
  const init = { method: "GET", ...config };
  return await http<T>(path, init);
}

export async function post<T, U>(path: string, body: T, config?: RequestInit): Promise<U | null> {
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}

export async function put<T, U>(path: string, body: T, config?: RequestInit): Promise<U | null> {
  const init = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}

export async function patch<T, U>(path: string, body: T, config?: RequestInit): Promise<U | null> {
  const init = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}

export async function remove<T, U>(path: string, body: T, config?: RequestInit): Promise<U | null> {
  const init = {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}
