import type { Mock } from "vitest";
import { vi } from "vitest";

// biome-ignore lint/style/useExportsLast: interface needed before function that uses it
export interface MockResponse {
  status: number;
  body: unknown;
  json: () => Promise<unknown>;
}

function createMockNextResponse(body: unknown, init?: { status?: number }): MockResponse {
  if (init?.status === undefined) {
    throw new Error("NextResponse.json() called without explicit status");
  }
  return {
    status: init.status,
    body,
    json: () => Promise.resolve(body),
  };
}

export function createNextServerMock(): {
  NextResponse: { json: (body: unknown, init?: { status?: number }) => MockResponse };
} {
  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => createMockNextResponse(body, init),
    },
  };
}

export function createNextHeadersMock(): {
  cookies: Mock;
  headers: Mock;
} {
  return {
    cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
    headers: vi.fn().mockResolvedValue(new Map()),
  };
}
