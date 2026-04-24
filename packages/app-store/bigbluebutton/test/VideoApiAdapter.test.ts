import { describe, it, expect, vi, beforeEach } from "vitest";
import BigBlueButtonVideoApiAdapter from "../lib/VideoApiAdapter";
import type { CredentialPayload } from "@calcom/types/Credential";

describe("BigBlueButtonVideoApiAdapter", () => {
  const mockCredential: CredentialPayload = {
    id: 1,
    type: "bigbluebutton_video",
    key: JSON.stringify({
      url: "https://test.bbb.example.com",
      secret: "test-secret-key",
    }),
    userId: 1,
    appId: "bigbluebutton",
    invalid: false,
    teamId: null,
  };

  let adapter: BigBlueButtonVideoApiAdapter;

  beforeEach(() => {
    adapter = new BigBlueButtonVideoApiAdapter(mockCredential);
    global.fetch = vi.fn();
  });

  describe("createMeeting", () => {
    it("should create a meeting successfully", async () => {
      const mockResponse = `
        <response>
          <returncode>SUCCESS</returncode>
          <meetingID>test-meeting-id</meetingID>
          <attendeePW>attendee-pass</attendeePW>
          <moderatorPW>moderator-pass</moderatorPW>
        </response>
      `;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await adapter.createMeeting({
        title: "Test Meeting",
        startTime: new Date().toISOString(),
      });

      expect(result.type).toBe("bigbluebutton_video");
      expect(result.id).toBeDefined();
      expect(result.url).toContain("bigbluebutton/api/join");
      expect(result.hostUrl).toContain("bigbluebutton/api/join");
      expect(result.password).toBeDefined();
    });

    it("should throw error when BBB API returns error", async () => {
      const mockResponse = `
        <response>
          <returncode>FAILED</returncode>
          <message>Invalid request</message>
        </response>
      `;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(
        adapter.createMeeting({
          title: "Test Meeting",
          startTime: new Date().toISOString(),
        })
      ).rejects.toThrow("BBB create meeting failed");
    });

    it("should include duration when provided", async () => {
      const mockResponse = `
        <response>
          <returncode>SUCCESS</returncode>
        </response>
      `;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      } as Response);

      await adapter.createMeeting({
        title: "Test Meeting",
        duration: 60,
        startTime: new Date().toISOString(),
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain("duration=60");
    });
  });

  describe("checkServerStatus", () => {
    it("should return true when server is available", async () => {
      const mockResponse = `
        <response>
          <returncode>SUCCESS</returncode>
        </response>
      `;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await adapter.checkServerStatus();
      expect(result).toBe(true);
    });

    it("should return false when server is unavailable", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      const result = await adapter.checkServerStatus();
      expect(result).toBe(false);
    });
  });

  describe("updateMeeting", () => {
    it("should create a new meeting when updating", async () => {
      const mockResponse = `
        <response>
          <returncode>SUCCESS</returncode>
        </response>
      `;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await adapter.updateMeeting("old-meeting-id", {
        title: "Updated Meeting",
        startTime: new Date().toISOString(),
      });

      expect(result.type).toBe("bigbluebutton_video");
      expect(result.id).toBeDefined();
    });
  });
});
