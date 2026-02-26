import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../http-error", () => ({
  HttpError: class HttpError extends Error {
    statusCode: number;
    constructor({ message, statusCode }: { message: string; statusCode: number }) {
      super(message);
      this.statusCode = statusCode;
      this.name = "HttpError";
    }
  },
}));

describe("checkCfTurnstileToken", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns success when CLOUDFLARE_TURNSTILE_SECRET is not set", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "");
    const { checkCfTurnstileToken } = await import("./checkCfTurnstileToken");

    const result = await checkCfTurnstileToken({ token: "some-token", remoteIp: "1.2.3.4" });
    expect(result).toEqual({ success: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns success when NEXT_PUBLIC_IS_E2E is set", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_IS_E2E", "1");
    const { checkCfTurnstileToken } = await import("./checkCfTurnstileToken");

    const result = await checkCfTurnstileToken({ token: "some-token", remoteIp: "1.2.3.4" });
    expect(result).toEqual({ success: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws HttpError 401 when token is missing and turnstile is enabled", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_IS_E2E", "");
    const { checkCfTurnstileToken } = await import("./checkCfTurnstileToken");

    await expect(checkCfTurnstileToken({ remoteIp: "1.2.3.4" })).rejects.toThrow(
      "No cloudflare token - please try again"
    );
  });

  it("calls Cloudflare siteverify API with correct parameters", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "my-secret");
    vi.stubEnv("NEXT_PUBLIC_IS_E2E", "");
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });
    const { checkCfTurnstileToken } = await import("./checkCfTurnstileToken");

    await checkCfTurnstileToken({ token: "user-token", remoteIp: "10.0.0.1" });

    expect(mockFetch).toHaveBeenCalledWith("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: expect.any(URLSearchParams),
    });

    const body = mockFetch.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("secret")).toBe("my-secret");
    expect(body.get("response")).toBe("user-token");
    expect(body.get("remoteip")).toBe("10.0.0.1");
  });

  it("returns data on successful verification", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "my-secret");
    vi.stubEnv("NEXT_PUBLIC_IS_E2E", "");
    const responseData = { success: true, challenge_ts: "2025-01-01T00:00:00Z", hostname: "example.com" };
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(responseData),
    });
    const { checkCfTurnstileToken } = await import("./checkCfTurnstileToken");

    const result = await checkCfTurnstileToken({ token: "valid-token", remoteIp: "1.2.3.4" });
    expect(result).toEqual(responseData);
  });

  it("throws HttpError with invalid cloudflare token message on failed verification", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "my-secret");
    vi.stubEnv("NEXT_PUBLIC_IS_E2E", "");
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, "error-codes": ["invalid-input-response"] }),
    });
    const { checkCfTurnstileToken, INVALID_CLOUDFLARE_TOKEN_ERROR } = await import("./checkCfTurnstileToken");

    await expect(checkCfTurnstileToken({ token: "bad-token", remoteIp: "1.2.3.4" })).rejects.toThrow(
      INVALID_CLOUDFLARE_TOKEN_ERROR
    );
  });
});
