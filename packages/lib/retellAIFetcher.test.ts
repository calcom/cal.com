import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHandleErrorsJson = vi.fn();

vi.mock("@calcom/lib/errors", () => ({
  handleErrorsJson: (...args: unknown[]) => mockHandleErrorsJson(...args),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { fetcher } from "./retellAIFetcher";

describe("fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RETELL_AI_KEY", "test-retell-key");
    mockHandleErrorsJson.mockImplementation((res) => res);
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: "test" }) });
  });

  it("calls fetch with correct URL prefix", async () => {
    await fetcher("/v1/agents");
    expect(mockFetch).toHaveBeenCalledWith("https://api.retellai.com/v1/agents", expect.objectContaining({}));
  });

  it("includes Authorization Bearer header from env", async () => {
    await fetcher("/v1/agents");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-retell-key",
        }),
      })
    );
  });

  it("sets Content-Type to application/json", async () => {
    await fetcher("/v1/agents");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("uses GET as default method", async () => {
    await fetcher("/v1/agents");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("allows init to override headers via spread", async () => {
    await fetcher("/v1/agents", { headers: { "X-Custom": "value" } });
    const calledWith = mockFetch.mock.calls[0][1];
    // The source spreads ...init after headers, so init.headers replaces base headers
    expect(calledWith.headers).toEqual({ "X-Custom": "value" });
  });

  it("passes response through handleErrorsJson", async () => {
    const mockResponse = { ok: true };
    mockFetch.mockResolvedValueOnce(mockResponse);
    mockHandleErrorsJson.mockReturnValueOnce({ parsed: true });
    const result = await fetcher("/v1/agents");
    expect(mockHandleErrorsJson).toHaveBeenCalledWith(mockResponse);
    expect(result).toEqual({ parsed: true });
  });
});
