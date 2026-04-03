import { getOGImageVersion } from "@calcom/lib/OgImages";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "../route";

vi.mock("next/og", () => ({
  ImageResponse: vi.fn().mockImplementation(function () {
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        },
      }),
    };
  }),
}));

vi.mock("@calcom/lib/OgImages", async (importOriginal) => {
  return await importOriginal();
});

vi.mock(import("@calcom/lib/constants"), async (importOriginal) => {
  return await importOriginal();
});

vi.mock("@calcom/web/public/app-store/svg-hashes.json", () => ({
  default: {
    huddle01video: "81a0653b",
    zoomvideo: "d1c78abf",
  },
}));

global.fetch = vi.fn();

function createNextRequest(url: string): NextRequest {
  const request = new Request(url, { method: "GET" });
  return new NextRequest(request);
}

describe("GET /api/social/og/image", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock handles both font fetches (.arrayBuffer) and SVG logo fetches (.text/.ok)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      text: vi.fn().mockResolvedValue('<svg><path d="M0 0H10V10H0Z" fill="#000"/></svg>'),
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
      expect(await response.text()).toBe("Wrong image type");
    });

    test("returns 404 when invalid type parameter is provided", async () => {
      const request = createNextRequest("http://example.com/api/social/og/image?type=invalid");
      const response = await GET(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Wrong image type");
    });
  });

  describe("Server errors (500 Internal Server Error)", () => {
    test("returns 500 when ImageResponse throws", async () => {
      const { ImageResponse } = await import("next/og");
      vi.mocked(ImageResponse).mockImplementation(function () {
        throw new Error("ImageResponse failed");
      });

      const request = createNextRequest(
        "http://example.com/api/social/og/image?type=meeting&title=Test&meetingProfileName=John"
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Internal server error");
    });
  });

  // These tests verify that the route handler pre-fetches avatar images and
  // converts them to base64 data URIs before passing to Satori.  Without this,
  // Satori fails to render cross-origin images in the Edge Runtime — which was
  // the root cause of broken avatars in OG images after the Next.js 16.2.1 upgrade.
  /** Extract the JSX element (first arg) passed to the ImageResponse constructor. */
  function getMeetingJsxProps(mock: ReturnType<typeof vi.fn>) {
    const firstArg = mock.mock.calls[0][0] as { props: { profile: { image?: string | null } } };
    return firstArg.props;
  }

  describe("Avatar image pre-fetching (prevents cross-origin failures in Satori)", () => {
    async function setupImageResponseMock() {
      const { ImageResponse } = await import("next/og");
      // Return a real Response (ImageResponse extends Response) so the route
      // handler can read `.body` exactly as it would in production.
      vi.mocked(ImageResponse).mockImplementation(function () {
        return new Response(new Uint8Array([1, 2, 3, 4])) as unknown as InstanceType<typeof ImageResponse>;
      });
      return vi.mocked(ImageResponse);
    }

    function resolveInputUrl(input: RequestInfo | URL): string {
      if (input instanceof URL) return input.toString();
      if (typeof input === "string") return input;
      return input.url;
    }

    function mockFetchWithAvatar(avatarUrl: string, avatarResponse: Response | Error): void {
      vi.mocked(global.fetch).mockImplementation(async function (input: RequestInfo | URL) {
        const url = resolveInputUrl(input);

        if (url === avatarUrl) {
          if (avatarResponse instanceof Error) throw avatarResponse;
          return avatarResponse;
        }

        // Default: return font data
        return new Response(new ArrayBuffer(8));
      });
    }

    test("converts meetingImage to a base64 data URI before passing to the renderer", async () => {
      const avatarUrl = "https://cal.com/api/avatar/test-user.png";
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

      mockFetchWithAvatar(
        avatarUrl,
        new Response(pngBytes.buffer, {
          status: 200,
          headers: { "content-type": "image/png" },
        })
      );

      const imageResponseMock = await setupImageResponseMock();

      const request = createNextRequest(
        `http://example.com/api/social/og/image?type=meeting&title=Test&meetingProfileName=John&meetingImage=${encodeURIComponent(avatarUrl)}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      // Verify the avatar URL was fetched for pre-processing
      const fetchedUrls = vi.mocked(global.fetch).mock.calls.map((call) => resolveInputUrl(call[0]));
      expect(fetchedUrls).toContain(avatarUrl);

      // Verify ImageResponse received a data URI, not the raw external URL
      const { profile } = getMeetingJsxProps(imageResponseMock);
      expect(profile.image).toMatch(/^data:image\/png;base64,/);
      expect(profile.image).not.toBe(avatarUrl);
    });

    test("falls back to original URL when avatar fetch returns non-OK status", async () => {
      const avatarUrl = "https://cal.com/api/avatar/test-user.png";

      mockFetchWithAvatar(avatarUrl, new Response(null, { status: 404 }));

      const imageResponseMock = await setupImageResponseMock();

      const request = createNextRequest(
        `http://example.com/api/social/og/image?type=meeting&title=Test&meetingProfileName=John&meetingImage=${encodeURIComponent(avatarUrl)}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      // Should fall back to the original URL when pre-fetch fails
      const { profile } = getMeetingJsxProps(imageResponseMock);
      expect(profile.image).toBe(avatarUrl);
    });

    test("falls back to original URL when avatar fetch throws a network error", async () => {
      const avatarUrl = "https://cal.com/api/avatar/test-user.png";

      mockFetchWithAvatar(avatarUrl, new Error("Network error"));

      const imageResponseMock = await setupImageResponseMock();

      const request = createNextRequest(
        `http://example.com/api/social/og/image?type=meeting&title=Test&meetingProfileName=John&meetingImage=${encodeURIComponent(avatarUrl)}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      const { profile } = getMeetingJsxProps(imageResponseMock);
      expect(profile.image).toBe(avatarUrl);
    });

    test("skips pre-fetch when meetingImage is not provided", async () => {
      vi.mocked(global.fetch).mockImplementation(async function () {
        return new Response(new ArrayBuffer(8));
      });

      const imageResponseMock = await setupImageResponseMock();

      const request = createNextRequest(
        "http://example.com/api/social/og/image?type=meeting&title=Test&meetingProfileName=John"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);

      // When no meetingImage param is provided, profile.image should be falsy
      const { profile } = getMeetingJsxProps(imageResponseMock);
      expect(profile.image).toBeFalsy();
    });
  });

  describe("getOGImageVersion with SVG hash", () => {
    test("app type: ETag changes when SVG hash is provided", async () => {
      const etagWithoutHash = await getOGImageVersion("app");
      const etagWithHash = await getOGImageVersion("app", {
        slug: "huddle01video",
        svgHash: "81a0653b",
      });

      expect(etagWithoutHash).toBeTruthy();
      expect(etagWithHash).toBeTruthy();
      expect(etagWithHash).not.toBe(etagWithoutHash);
    });

    test("app type: different SVG hashes produce different ETags", async () => {
      const etagHash1 = await getOGImageVersion("app", {
        slug: "huddle01video",
        svgHash: "81a0653b",
      });
      const etagHash2 = await getOGImageVersion("app", {
        slug: "zoomvideo",
        svgHash: "d1c78abf",
      });

      expect(etagHash1).toBeTruthy();
      expect(etagHash2).toBeTruthy();
      expect(etagHash1).not.toBe(etagHash2);
    });
  });
});
