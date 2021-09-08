import { mapFetchErrorToHttpException } from "./fetch-exception.mapper";
import { ServerErrorPayload } from "@lib/core/error/http/http-exception";
import { HttpExceptionFactory } from "@lib/core/error/http/http-exception.factory";

async function http<T>(path: string, config: RequestInit): Promise<T> {
  const request = new Request(path, config);
  const response: Response = await fetch(request);

  if (!response.ok) {
    const err = HttpExceptionFactory.fromStatus(response.status, response.statusText);
    let errorPayload: ServerErrorPayload | undefined;
    try {
      errorPayload = {
        type: "json",
        content: await response.json(),
      };
    } catch (e) {
      // ignore if the error response does not contain valid json.
    }
    if (!errorPayload) {
      try {
        errorPayload = {
          type: "text",
          content: await response.text(),
        };
      } catch (e) {
        // ignore if the error response does not contain valid json.
      }
    }
    throw mapFetchErrorToHttpException(err, path, config.method, errorPayload);
  }
  // may error if there is no body, return empty array
  return response.json().catch(() => ({}));
}

export async function get<T>(path: string, config?: RequestInit): Promise<T> {
  const init = { method: "GET", ...config };
  return await http<T>(path, init);
}

export async function post<T, U>(path: string, body: T, config?: RequestInit): Promise<U> {
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}

export async function put<T, U>(path: string, body: T, config?: RequestInit): Promise<U> {
  const init = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}

export async function patch<T, U>(path: string, body: T, config?: RequestInit): Promise<U> {
  const init = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}

export async function remove<T, U>(path: string, body: T, config?: RequestInit): Promise<U> {
  const init = {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...config,
  };
  return await http<U>(path, init);
}
