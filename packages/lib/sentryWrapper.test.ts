import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  startSpan: vi.fn((_opts: unknown, cb: (span: { setAttribute: () => void }) => unknown) =>
    cb({ setAttribute: vi.fn() })
  ),
}));

import monitorCallbackAsync, {
  isTelemetryEnabled,
  monitorCallbackSync,
  withReporting,
  withSpan,
} from "./sentryWrapper";

describe("isTelemetryEnabled", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when no Sentry DSN and not in development", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("returns true when Sentry DSN is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.example.com/123");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");
    expect(isTelemetryEnabled()).toBe(true);
  });

  it("returns true in development mode even without Sentry", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isTelemetryEnabled()).toBe(true);
  });
});

describe("withReporting", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws if name is empty", () => {
    expect(() => withReporting(() => {}, "")).toThrow("withReporting requires a non-empty name parameter");
    expect(() => withReporting(() => {}, "   ")).toThrow("withReporting requires a non-empty name parameter");
  });

  it("returns the original function when Sentry env vars are not set", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    const fn = () => 42;
    const wrapped = withReporting(fn, "testFn");
    expect(wrapped).toBe(fn);
  });

  it("wraps sync function and re-throws on error when Sentry is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.example.com/123");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const error = new Error("sync failure");
    const failing = () => {
      throw error;
    };
    const wrapped = withReporting(failing, "failingSync");
    expect(() => wrapped()).toThrow("sync failure");
  });

  it("wraps async function and re-throws on error when Sentry is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.example.com/123");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const error = new Error("async failure");
    const failing = async () => {
      throw error;
    };
    const wrapped = withReporting(failing, "failingAsync");
    await expect(wrapped()).rejects.toThrow("async failure");
  });

  it("returns the result of a successful sync function when Sentry is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.example.com/123");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const fn = (a: number, b: number) => a + b;
    const wrapped = withReporting(fn, "addFn");
    expect(wrapped(2, 3)).toBe(5);
  });
});

describe("withSpan", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls callback with no-op span when Sentry is not configured and not in development", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "test");

    const result = await withSpan({ name: "test-span" }, async (span) => {
      span.setAttribute("key", "value");
      return 42;
    });
    expect(result).toBe(42);
  });

  it("uses console span in development mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "development");

    const result = await withSpan({ name: "dev-span", op: "test.op" }, async (span) => {
      span.setAttribute("count", 5);
      return "dev-result";
    });
    expect(result).toBe("dev-result");
  });

  it("re-throws errors in development mode console span", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    vi.stubEnv("NODE_ENV", "development");

    await expect(
      withSpan({ name: "error-span" }, async () => {
        throw new Error("dev error");
      })
    ).rejects.toThrow("dev error");
  });
});

describe("monitorCallbackAsync (default export)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("executes callback directly when Sentry is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");

    const cb = vi.fn().mockResolvedValue("result");
    const result = await monitorCallbackAsync(cb, "arg1", "arg2");
    expect(result).toBe("result");
    expect(cb).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("wraps callback with Sentry span when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.example.com/123");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const cb = vi.fn().mockResolvedValue("monitored");
    const result = await monitorCallbackAsync(cb, "a");
    expect(result).toBe("monitored");
  });
});

describe("monitorCallbackSync", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("executes callback directly when Sentry is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");

    const cb = vi.fn().mockReturnValue("sync-result");
    const result = monitorCallbackSync(cb, "x");
    expect(result).toBe("sync-result");
    expect(cb).toHaveBeenCalledWith("x");
  });

  it("wraps callback with Sentry span when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://sentry.example.com/123");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "1.0");

    const cb = vi.fn().mockReturnValue("sync-monitored");
    const result = monitorCallbackSync(cb, "y");
    expect(result).toBe("sync-monitored");
  });
});
