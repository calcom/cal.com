import { vi } from "vitest";

export type FakeUrlConfig = {
  origin?: string;
  path?: string;
  params?: Record<string, string>;
};

export function fakeCurrentDocumentUrl({
  origin = "https://example.com",
  path = "",
  params = {},
}: FakeUrlConfig = {}): ReturnType<typeof vi.spyOn> {
  const url = new URL(path, origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return overrideDocumentUrl(url);
}

export function overrideDocumentUrl(url: URL | string): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(document, "URL", "get").mockReturnValue(url.toString());
}

export function advanceClock(): void {
  vi.advanceTimersByTime(100);
}

export function markBookerReady(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._embedBookerState = "slotsDone";
}

export function markBookerLoadingSlots(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._embedBookerState = "slotsLoading";
}
