import { expect, test, vi, describe, beforeEach, afterEach } from "vitest";

import { BBBApi } from "./bbbapi";
import { Action, bbbError, Role } from "./types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const validOptions = {
  url: "https://bbb.example.com/bigbluebutton/api",
  secret: "test-secret-key",
  hash: "sha256" as const,
};

// Mock XML responses
const successInstanceInfoXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <version>2.0</version>
  <apiVersion>2.0</apiVersion>
  <bbbVersion>2.7.0</bbbVersion>
</response>`;

const successCreateMeetingXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <meetingID>test-meeting-123</meetingID>
  <internalMeetingID>abc123</internalMeetingID>
  <parentMeetingID>bbb-none</parentMeetingID>
  <attendeePW>ap</attendeePW>
  <moderatorPW>mp</moderatorPW>
  <createTime>1749413782498</createTime>
  <voiceBridge>12345</voiceBridge>
  <dialNumber>613-555-1234</dialNumber>
  <createDate>Sun Jun 08 20:16:22 UTC 2025</createDate>
  <hasUserJoined>false</hasUserJoined>
  <duration>0</duration>
  <hasBeenForciblyEnded>false</hasBeenForciblyEnded>
  <messageKey></messageKey>
  <message></message>
</response>`;

const successJoinMeetingXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <messageKey>successfullyJoined</messageKey>
  <message>You have joined successfully.</message>
  <meeting_id>test-meeting-123</meeting_id>
  <user_id>w_test123</user_id>
  <auth_token>authtoken123</auth_token>
  <session_token>sessiontoken123</session_token>
  <guestStatus>ALLOW</guestStatus>
  <url>https://bbb.example.com/html5client?sessionToken=sessiontoken123</url>
</response>`;

const checksumErrorXml = `<?xml version="1.0"?>
<response>
  <returncode>FAILED</returncode>
  <messageKey>checksumError</messageKey>
  <message>Checksums do not match</message>
</response>`;

const oldApiVersionXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <version>1.0</version>
  <apiVersion>1.0</apiVersion>
</response>`;

function mockResponse(xml: string, ok = true) {
  return Promise.resolve({
    ok,
    text: () => Promise.resolve(xml),
  });
}

describe("BBBApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createUrl", () => {
    test("creates URL with correct checksum", () => {
      const api = new BBBApi(validOptions);
      const params = new URLSearchParams({ meetingID: "test-123", name: "Test Meeting" });
      const url = api.createUrl(Action.CREATE, params);

      expect(url).toContain("https://bbb.example.com/bigbluebutton/api/create");
      expect(url).toContain("meetingID=test-123");
      expect(url).toContain("name=Test+Meeting");
      expect(url).toContain("checksum=");
    });

    test("handles URL with trailing slash", () => {
      const api = new BBBApi({ ...validOptions, url: "https://bbb.example.com/bigbluebutton/api/" });
      const params = new URLSearchParams({ meetingID: "test-123" });
      const url = api.createUrl(Action.CREATE, params);

      expect(url).toContain("https://bbb.example.com/bigbluebutton/api/create");
    });
  });

  describe("createMeeting", () => {
    test("successfully creates a meeting", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(successCreateMeetingXml));

      const api = new BBBApi(validOptions);
      const result = await api.createMeeting("test-meeting-123", "Test Meeting");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meetingID).toBe("test-meeting-123");
        expect(result.data.moderatorPW).toBe("mp");
        expect(result.data.attendeePW).toBe("ap");
      }
    });

    test("handles checksum error", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(checksumErrorXml));

      const api = new BBBApi(validOptions);
      const result = await api.createMeeting("test-meeting", "Test");

      expect(result.success).toBe(false);
      if (!result.success && "error" in result) {
        expect(result.error).toBe(bbbError.INVALID_CHECKSUM);
      }
    });

    test("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const api = new BBBApi(validOptions);
      const result = await api.createMeeting("test-meeting", "Test");

      expect(result.success).toBe(false);
      if (!result.success && "error" in result) {
        expect(result.error).toBe(bbbError.CANNOT_REACH_SERVER);
      }
    });
  });

  describe("joinMeeting", () => {
    test("successfully joins a meeting", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(successJoinMeetingXml));

      const api = new BBBApi(validOptions);
      const result = await api.joinMeeting("test-meeting-123", "John Doe", Role.MODERATOR);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toContain("html5client");
        expect(result.data.user_id).toBe("w_test123");
      }
    });
  });

  describe("checkValidOptions", () => {
    test("returns true for valid options with API version >= 2.0", async () => {
      // First call for instance info, second for checksum validation
      mockFetch
        .mockResolvedValueOnce(mockResponse(successInstanceInfoXml))
        .mockResolvedValueOnce(mockResponse(successCreateMeetingXml));

      const api = new BBBApi(validOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test("returns false for API version < 2.0", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(oldApiVersionXml));

      const api = new BBBApi(validOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(false);
    });

    test("returns false when server is unreachable", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const api = new BBBApi(validOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(false);
    });

    test("returns false for invalid checksum", async () => {
      // Instance info succeeds
      mockFetch.mockResolvedValueOnce(mockResponse(successInstanceInfoXml));
      // Checksum validation fails
      mockFetch.mockResolvedValueOnce(mockResponse(checksumErrorXml));

      const api = new BBBApi(validOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(false);
    });
  });

  describe("error handling", () => {
    test("handles non-ok HTTP response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve(""),
      });

      const api = new BBBApi(validOptions);
      const result = await api.createMeeting("test", "Test");

      expect(result.success).toBe(false);
      if (!result.success && "error" in result) {
        expect(result.error).toBe(bbbError.CANNOT_REACH_SERVER);
      }
    });

    test("handles invalid XML response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("not valid xml <<>>"),
      });

      const api = new BBBApi(validOptions);
      const result = await api.createMeeting("test", "Test");

      expect(result.success).toBe(false);
      if (!result.success && "error" in result) {
        expect(result.error).toBe(bbbError.INVALID_XML_FORMAT);
      }
    });
  });
});
