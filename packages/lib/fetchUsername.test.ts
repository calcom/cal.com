import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { fetchUsername } from "./fetchUsername";

describe("fetchUsername", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends POST request to /api/username", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ available: true, premium: false }),
    });

    await fetchUsername("testuser", null);

    expect(mockFetch).toHaveBeenCalledWith("/api/username", {
      credentials: "include",
      method: "POST",
      body: JSON.stringify({ username: "testuser", orgSlug: undefined }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("trims whitespace from username", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ available: true, premium: false }),
    });

    await fetchUsername("  spaceduser  ", null);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.username).toBe("spaceduser");
  });

  it("includes orgSlug when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ available: true, premium: false }),
    });

    await fetchUsername("user", "my-org");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.orgSlug).toBe("my-org");
  });

  it("converts null orgSlug to undefined", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ available: true, premium: false }),
    });

    await fetchUsername("user", null);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.orgSlug).toBeUndefined();
  });

  it("returns response and parsed data", async () => {
    const mockResponse = {
      json: () => Promise.resolve({ available: false, premium: true, suggestion: "user2" }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchUsername("user", null);

    expect(result.response).toBe(mockResponse);
    expect(result.data).toEqual({ available: false, premium: true, suggestion: "user2" });
  });
});
