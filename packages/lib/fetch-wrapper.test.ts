import { describe, expect, it, vi, afterEach } from "vitest";

import { get, patch, post, put, remove } from "./fetch-wrapper";

const createMockResponse = (body: unknown, ok = true, status = 200, statusText = "OK"): Response =>
  ({
    ok,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
    url: "https://api.example.com/test",
  }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

function mockFetch(response: Response) {
  fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
}

describe("fetch-wrapper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("get", () => {
    it("returns parsed JSON on success", async () => {
      const mockData = { id: 1, name: "test" };
      mockFetch(createMockResponse(mockData));

      const result = await get<typeof mockData>("https://api.example.com/test");
      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("throws HttpError on non-ok response", async () => {
      mockFetch(createMockResponse({ message: "Not Found" }, false, 404, "Not Found"));
      await expect(get("https://api.example.com/missing")).rejects.toThrow();
    });
  });

  describe("post", () => {
    it("returns parsed JSON on success", async () => {
      const responseData = { success: true };
      mockFetch(createMockResponse(responseData));

      const result = await post<{ name: string }, { success: boolean }>(
        "https://api.example.com/items",
        { name: "new item" }
      );
      expect(result).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe("put", () => {
    it("returns parsed JSON on success", async () => {
      const responseData = { updated: true };
      mockFetch(createMockResponse(responseData));

      const result = await put<{ name: string }, { updated: boolean }>(
        "https://api.example.com/items/1",
        { name: "updated" }
      );
      expect(result).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe("patch", () => {
    it("returns parsed JSON on success", async () => {
      const responseData = { patched: true };
      mockFetch(createMockResponse(responseData));

      const result = await patch<{ name: string }, { patched: boolean }>(
        "https://api.example.com/items/1",
        { name: "patched" }
      );
      expect(result).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe("remove", () => {
    it("returns parsed JSON on success", async () => {
      const responseData = { deleted: true };
      mockFetch(createMockResponse(responseData));

      const result = await remove<{ id: number }, { deleted: boolean }>(
        "https://api.example.com/items/1",
        { id: 1 }
      );
      expect(result).toEqual(responseData);
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe("error handling", () => {
    it("throws HttpError with message from error response body", async () => {
      mockFetch(createMockResponse({ message: "Validation failed" }, false, 400, "Validation failed"));
      await expect(get("https://api.example.com/bad")).rejects.toThrow("Validation failed");
    });

    it("throws HttpError with statusCode from response", async () => {
      mockFetch(createMockResponse({ message: "Forbidden" }, false, 403, "Forbidden"));

      try {
        await post("https://api.example.com/forbidden", {});
        expect.fail("Should have thrown");
      } catch (err: unknown) {
        const error = err as { statusCode: number; method: string };
        expect(error.statusCode).toBe(403);
        expect(error.method).toBe("POST");
      }
    });

    it("includes data from error response", async () => {
      const errorData = { message: "Error", data: { field: "name", issue: "required" } };
      mockFetch(createMockResponse(errorData, false, 422, "Unprocessable"));

      try {
        await post("https://api.example.com/create", {});
        expect.fail("Should have thrown");
      } catch (err: unknown) {
        const error = err as { data: Record<string, unknown> };
        expect(error.data).toEqual({ field: "name", issue: "required" });
      }
    });
  });
});
