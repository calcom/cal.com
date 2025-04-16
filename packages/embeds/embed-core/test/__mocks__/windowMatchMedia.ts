import { beforeEach, afterEach, vi } from "vitest";

let __matchMediaFakeQuery: string[] = [];
// Mock matchMedia - Not Provided by JSDOM
function mockWindowMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const eventListeners: Record<string, ((event: MediaQueryListEvent) => void)[]> = {
      change: [],
    };
    const matches = __matchMediaFakeQuery.includes(query);
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: (event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === "change") {
          console.log("addEventListener called", event, listener);
          eventListeners.change.push(listener);
        }
      },
      removeEventListener: (event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === "change") {
          eventListeners.change = eventListeners.change.filter((l) => l !== listener);
          console.log("removeEventListener called, Remaining listeners", eventListeners.change.length);
        }
      },
      dispatchEvent: (event: MediaQueryListEvent) => {
        if (event.type === "change") {
          eventListeners.change.forEach((listener) => {
            console.log("listener called", listener);
            listener(event as MediaQueryListEvent);
          });
        }
      },
    };
  });
}
// Call immediately so that imports accessing window.matchMedia on import can access the mock
mockWindowMatchMedia();

beforeEach(() => {
  // Do on beforeEach because vi.fn() gets reset after each test
  mockWindowMatchMedia();
});

afterEach(() => {
  __matchMediaFakeQuery = [];
});
export function fakeDeviceMatchesMediaQuery(query: string) {
  // Extract the query type (e.g., max-width or prefers-color-scheme)
  const queryType = query.match(/(max-width|prefers-color-scheme)/)?.[0];

  if (queryType) {
    // Remove any existing queries of the same type
    __matchMediaFakeQuery = __matchMediaFakeQuery.filter(
      (existingQuery) => !existingQuery.includes(queryType)
    );
  }

  // Add the new query
  __matchMediaFakeQuery.push(query);
  console.log("__mock__:fakeDeviceMatchesMediaQuery updated", { query, __matchMediaFakeQuery });
}
