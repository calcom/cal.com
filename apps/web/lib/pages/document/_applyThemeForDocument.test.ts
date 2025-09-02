import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { applyTheme } from "./_applyThemeForDocument";

describe("applyTheme", () => {
  let reconstructedFn: () => void;
  let mockLocalStorage: Storage;
  let mockRequestAnimationFrame: typeof window.requestAnimationFrame;
  let mockDocument: Document;
  let addedClasses: string[] = [];

  beforeEach(() => {
    // Create the function from stringified version
    const stringifiedFunction = applyTheme.toString();
    reconstructedFn = new Function(`return ${stringifiedFunction}`)();

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.localStorage = mockLocalStorage;

    // Mock requestAnimationFrame
    mockRequestAnimationFrame = vi.fn((cb) => {
      cb(0);
      return 0;
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.window = { location: { pathname: "/" } };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.requestAnimationFrame = mockRequestAnimationFrame;

    // Mock document
    addedClasses = [];
    mockDocument = {
      body: {
        classList: {
          add: vi.fn((className: string) => {
            addedClasses.push(className);
          }),
        },
      },
    } as unknown as Document;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.document = mockDocument;

    // Mock console.error
    global.console.error = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be reconstructable from toString() and executable", () => {
    expect(() => reconstructedFn()).not.toThrow();
  });

  it("should not add any theme when no app-theme is found", () => {
    reconstructedFn();

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    expect(addedClasses).toHaveLength(0);
  });

  it("should handle localStorage errors gracefully", () => {
    // Make localStorage throw an error
    mockLocalStorage.getItem = vi.fn(() => {
      throw new Error("localStorage not available");
    });
    mockLocalStorage.key = vi.fn(() => {
      throw new Error("localStorage not available");
    });
    Object.defineProperty(mockLocalStorage, "length", {
      get: () => {
        throw new Error("localStorage not available");
      },
    });

    expect(() => reconstructedFn()).not.toThrow();
    expect(addedClasses).toHaveLength(0);
  });

  it("should apply booking theme when app-theme exists and on booking page", () => {
    const username = "testuser";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.window.location.pathname = `/${username}/meeting`;

    mockLocalStorage.key = vi.fn((index: number) => {
      if (index === 0) return `booking-theme:${username}`;
      return null;
    });
    mockLocalStorage.getItem = vi.fn((key: string) => {
      if (key === "app-theme") return "light";
      if (key === `booking-theme:${username}`) return "dark";
      return null;
    });
    Object.defineProperty(mockLocalStorage, "length", {
      get: () => 1,
      configurable: true,
    });

    reconstructedFn();

    expect(addedClasses).toContain("dark");
  });

  it("should apply app theme when not on booking page", () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.window.location.pathname = "/some-other-page";

    mockLocalStorage.key = vi.fn((index: number) => {
      if (index === 0) return "booking-theme:testuser";
      return null;
    });
    mockLocalStorage.getItem = vi.fn((key: string) => {
      if (key === "app-theme") return "light";
      if (key === "booking-theme:testuser") return "dark";
      return null;
    });
    Object.defineProperty(mockLocalStorage, "length", {
      get: () => 1,
      configurable: true,
    });

    reconstructedFn();

    expect(addedClasses).toContain("light");
  });

  it("should apply app theme when app-theme exists but no booking theme", () => {
    mockLocalStorage.getItem = vi.fn((key: string) => {
      if (key === "app-theme") return "dark";
      return null;
    });
    Object.defineProperty(mockLocalStorage, "length", {
      get: () => 0,
      configurable: true,
    });

    reconstructedFn();

    expect(addedClasses).toContain("dark");
  });
});
