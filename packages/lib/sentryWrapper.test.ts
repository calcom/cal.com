import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  startSpan: vi.fn((_opts: unknown, cb: (span: { setAttribute: () => void }) => unknown) =>
    cb({ setAttribute: vi.fn() })
  ),
}));

vi.mock("./logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("./redactSensitiveData", () => ({
  redactSensitiveData: vi.fn((data: unknown) => data),
}));

import { captureException, startSpan } from "@sentry/nextjs";

import { isTelemetryEnabled, withReporting, withSpan } from "./sentryWrapper";

describe("withReporting", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("throws when name is empty", () => {
    expect(() => withReporting(() => 42, "")).toThrow("withReporting requires a non-empty name parameter");
  });

  it("throws when name is whitespace", () => {
    expect(() => withReporting(() => 42, "   ")).toThrow("withReporting requires a non-empty name parameter");
  });

  it("returns the original function when Sentry is not configured", () => {
    const fn = () => 42;
    const wrapped = withReporting(fn, "testFn");
    expect(wrapped).toBe(fn);
  });

  it("wraps function with Sentry span when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.io/test");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const fn = (x: number) => x * 2;
    const wrapped = withReporting(fn, "doubleFn");

    expect(wrapped).not.toBe(fn);
    const result = wrapped(5);
    expect(result).toBe(10);
    expect(startSpan).toHaveBeenCalledWith({ name: "doubleFn" }, expect.any(Function));
  });

  it("captures exception and rethrows for sync errors", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.io/test");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const error = new Error("sync fail");
    const fn = () => {
      throw error;
    };
    const wrapped = withReporting(fn, "failFn");

    expect(() => wrapped()).toThrow(error);
    expect(captureException).toHaveBeenCalled();
  });

  it("captures exception for async rejections", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.io/test");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const error = new Error("async fail");
    const fn = async () => {
      throw error;
    };
    const wrapped = withReporting(fn, "asyncFail");

    await expect(wrapped()).rejects.toThrow(error);
    expect(captureException).toHaveBeenCalled();
  });

  it("preserves function arguments", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.io/test");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const fn = (a: string, b: number) => `${a}-${b}`;
    const wrapped = withReporting(fn, "concatFn");

    expect(wrapped("hello", 42)).toBe("hello-42");
  });
});

describe("isTelemetryEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when Sentry is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.io/test");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");
    vi.stubEnv("NODE_ENV", "production");

    expect(isTelemetryEnabled()).toBe(true);
  });

  it("returns true in development mode even without Sentry", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(isTelemetryEnabled()).toBe(true);
  });

  it("returns false in production without Sentry", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(isTelemetryEnabled()).toBe(false);
  });
});

describe("withSpan", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("calls callback with Sentry span when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.io/test");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    vi.mocked(startSpan).mockImplementation((_opts, cb) => {
      return (cb as (span: { setAttribute: () => void }) => Promise<string>)({
        setAttribute: vi.fn(),
      });
    });

    const result = await withSpan({ name: "test-span" }, async (span) => {
      span.setAttribute("key", "value");
      return "result";
    });

    expect(result).toBe("result");
  });

  it("falls back to console logging in development", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "development");

    const result = await withSpan({ name: "dev-span", op: "test" }, async (span) => {
      span.setAttribute("count", 5);
      return "dev-result";
    });

    expect(result).toBe("dev-result");
  });

  it("uses no-op span in production without Sentry", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "production");

    const result = await withSpan({ name: "noop-span" }, async (span) => {
      span.setAttribute("x", 1); // should not throw
      return "noop-result";
    });

    expect(result).toBe("noop-result");
  });

  it("propagates errors in development mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "development");

    await expect(
      withSpan({ name: "error-span" }, async () => {
        throw new Error("span error");
      })
    ).rejects.toThrow("span error");
  });
});
