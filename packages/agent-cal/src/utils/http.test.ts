import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCalHttpError, request } from "./http.js";

describe("http request", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Bearer and returns parsed JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: "success", data: [] })),
    });
    const result = await request({
      method: "GET",
      path: "/v2/calendars",
      bearerToken: "cal_secret",
      fetchImpl: fetchMock,
      maxRetries: 0,
    });
    expect(result).toEqual({ status: "success", data: [] });
    expect(fetchMock.mock.calls[0][1]?.headers?.Authorization).toBe("Bearer cal_secret");
  });

  it("throws AgentCalHttpError on 4xx", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve("Invalid token"),
    });
    let err: unknown;
    try {
      await request({
        method: "GET",
        path: "/v2/calendars",
        bearerToken: "bad",
        fetchImpl: fetchMock,
        maxRetries: 0,
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(AgentCalHttpError);
    expect((err as AgentCalHttpError).status).toBe(401);
    expect((err as AgentCalHttpError).body).toBe("Invalid token");
  });

  it("retries on 502 up to maxRetries", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ ok: true })),
      });
    const result = await request({
      method: "GET",
      path: "/v2/calendars",
      bearerToken: "cal",
      fetchImpl: fetchMock,
      maxRetries: 2,
    });
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
