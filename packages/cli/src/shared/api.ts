import { getApiUrl, getAuthToken } from "./config";
import type { ApiVersionValue } from "./constants";

interface ApiRequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
  apiVersion?: ApiVersionValue;
}

interface ValidationConstraints {
  [key: string]: string;
}

interface ValidationError {
  property?: string;
  constraints?: ValidationConstraints;
  children?: ValidationError[];
}

interface ApiErrorDetails {
  message?: string;
  errors?: ValidationError[];
}

interface ApiErrorBody {
  status?: string;
  message?: string;
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: string | ApiErrorDetails;
      };
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

async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const apiUrl = getApiUrl();
  const apiKey = await getAuthToken();
  const { method = "GET", body, query, headers = {}, apiVersion } = options;

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
    ...headers,
  };

  if (apiVersion) {
    fetchHeaders["cal-api-version"] = apiVersion;
  }

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
      if (!errorBody) {
        errorBody = `HTTP ${response.status} ${response.statusText}`;
      }
    } catch {
      errorBody = `HTTP ${response.status} ${response.statusText}`;
    }
    try {
      const parsed = JSON.parse(errorBody) as ApiErrorBody;
      const message = formatApiError(parsed);
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

function extractValidationMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const err of errors) {
    if (err.constraints) {
      const constraintValues = Object.values(err.constraints);
      for (const msg of constraintValues) {
        if (err.property) {
          messages.push(`${err.property}: ${msg}`);
        } else {
          messages.push(msg);
        }
      }
    }
    if (err.children && err.children.length > 0) {
      const childMessages = extractValidationMessages(err.children);
      for (const childMsg of childMessages) {
        if (err.property) {
          messages.push(`${err.property}.${childMsg}`);
        } else {
          messages.push(childMsg);
        }
      }
    }
  }
  return messages;
}

function formatApiError(body: ApiErrorBody): string {
  if (body.error && typeof body.error === "object") {
    const errorObj = body.error;

    if (errorObj.details && typeof errorObj.details === "object") {
      const details = errorObj.details;
      if (details.errors && Array.isArray(details.errors) && details.errors.length > 0) {
        const validationMessages = extractValidationMessages(details.errors);
        if (validationMessages.length > 0) {
          return validationMessages.join("; ");
        }
      }
    }

    if (typeof errorObj.message === "string" && errorObj.message.length > 0) {
      return errorObj.message;
    }

    if (typeof errorObj.details === "string" && errorObj.details.length > 0) {
      return errorObj.details;
    }

    if (typeof errorObj.code === "string" && errorObj.code.length > 0) {
      return errorObj.code;
    }
  }

  if (typeof body.error === "string" && body.error.length > 0) {
    return body.error;
  }

  if (typeof body.message === "string" && body.message.length > 0) {
    return body.message;
  }

  return JSON.stringify(body);
}

export { apiRequest, formatApiError };
