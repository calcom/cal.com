import { vi } from "vitest";

export type fakeCurrentDocumentUrlParams = {
  origin?: string;
  path?: string;
  params?: Record<string, string>;
};

export function fakeCurrentDocumentUrl({
  origin = "https://example.com",
  path = "",
  params = {},
}: fakeCurrentDocumentUrlParams = {}) {
  const url = new URL(path, origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return mockDocumentUrl(url);
}

export function mockDocumentUrl(url: URL | string) {
  return vi.spyOn(document, "URL", "get").mockReturnValue(url.toString());
}

export function nextTick() {
  vi.advanceTimersByTime(100);
}

export function takeBookerToReadyState() {
  window._embedBookerState = "slotsDone";
}

export function takeBookerToSlotsLoadingState() {
  window._embedBookerState = "slotsLoading";
}
