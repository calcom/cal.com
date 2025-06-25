import { NextRequest } from "next/server";
import { describe, expect, test, vi, beforeEach } from "vitest";

import { GET } from "../route";

vi.mock("next/og", () => ({
  ImageResponse: vi.fn().mockImplementation(() => ({
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.close();
      },
    }),
  })),
}));

vi.mock("@calcom/lib/OgImages", () => ({
  Meeting: vi.fn(() => null),
  App: vi.fn(() => null),
  Generic: vi.fn(() => null),
}));

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "http://localhost:3000",
}));

global.fetch = vi.fn();

function createNextRequest(url: string): NextRequest {
  const request = new Request(url, { method: "GET" });
  return new NextRequest(request);
}

describe("GET /api/social/og/image", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(global.fetch).mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as any);
  });

  describe("Validation errors (400 Bad Request)", () => {
    test("meeting type: returns 400 when required parameters are missing", async () => {
      const request = createNextRequest("http://example.com/api/social/og/image?type=meeting");
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const errorData = await response.json();
      expect(errorData.error).toBe("Invalid parameters for meeting image");
      expect(errorData.message).toBe(
        "Required parameters: title, meetingProfileName. Optional: names, usernames, meetingImage"
      );
    });

    test("app type: returns 400 when required parameters are missing", async () => {
      const request = createNextRequest("http://example.com/api/social/og/image?type=app");
      const response = await GET(request);

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.error).toBe("Invalid parameters for app image");
      expect(errorData.message).toBe("Required parameters: name, description, slug");
    });

    test("generic type: returns 400 when required parameters are missing", async () => {
      const request = createNextRequest("http://example.com/api/social/og/image?type=generic");
      const response = await GET(request);

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.error).toBe("Invalid parameters for generic image");
      expect(errorData.message).toBe("Required parameters: title, description");
    });
  });

  describe("Not found errors (404 Not Found)", () => {
    test("returns 404 when no type parameter is provided", async () => {
      const request = createNextRequest("http://example.com/api/social/og/image");
      const response = await GET(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("What you're looking for is not here..");
    });

    test("returns 404 when invalid type parameter is provided", async () => {
      const request = createNextRequest("http://example.com/api/social/og/image?type=invalid");
      const response = await GET(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("What you're looking for is not here..");
    });
  });

  describe("Server errors (500 Internal Server Error)", () => {
    test("returns 500 when font loading fails", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Font loading failed"));

      const request = createNextRequest(
        "http://example.com/api/social/og/image?type=meeting&title=Test&meetingProfileName=John"
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Internal server error");
    });
  });
});
