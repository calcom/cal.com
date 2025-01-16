import { NextResponse } from "next/server";
import { describe, expect, test, vi, afterEach } from "vitest";

import { getDownloadLinkOfCalVideoByRecordingId } from "@calcom/core/videoClient";
import { verifyVideoToken } from "@calcom/lib/videoTokens";

import { GET } from "../route";

vi.mock("@calcom/core/videoClient", () => ({
  getDownloadLinkOfCalVideoByRecordingId: vi.fn(),
}));

vi.mock("@calcom/lib/videoTokens", () => ({
  verifyVideoToken: vi.fn(),
}));

describe("GET /api/video/recording", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test("returns 401 when token is missing", async () => {
    const request = new Request("http://example.com/api/video/recording");
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Missing token");
  });

  test("returns 401 when token is invalid", async () => {
    vi.mocked(verifyVideoToken).mockReturnValue({ valid: false, recordingId: null });

    const request = new Request("http://example.com/api/video/recording?token=invalid_token");
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Invalid or expired token");
  });

  test("returns 404 when recording is not found", async () => {
    vi.mocked(verifyVideoToken).mockReturnValue({ valid: true, recordingId: "test_id" });
    vi.mocked(getDownloadLinkOfCalVideoByRecordingId).mockResolvedValue(null);

    const request = new Request("http://example.com/api/video/recording?token=valid_token");
    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Recording not found");
  });

  test("redirects to download link when recording exists", async () => {
    vi.mocked(verifyVideoToken).mockReturnValue({ valid: true, recordingId: "test_id" });
    vi.mocked(getDownloadLinkOfCalVideoByRecordingId).mockResolvedValue({
      download_link: "https://example.com/download",
    });

    const request = new Request("http://example.com/api/video/recording?token=valid_token");
    const response = await GET(request);

    expect(response instanceof NextResponse).toBe(true);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/download");
  });

  test("returns 500 when getting recording fails", async () => {
    vi.mocked(verifyVideoToken).mockReturnValue({ valid: true, recordingId: "test_id" });
    vi.mocked(getDownloadLinkOfCalVideoByRecordingId).mockRejectedValue(new Error("Failed to get recording"));

    const request = new Request("http://example.com/api/video/recording?token=valid_token");
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Failed to get recording");
  });
});
