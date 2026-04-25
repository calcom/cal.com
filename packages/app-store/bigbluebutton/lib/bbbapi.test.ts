import { describe, it, expect, vi, beforeEach } from "vitest";

import { BBBApi } from "./bbbapi";
import { bbbError } from "./types";

const mockOptions = {
  url: "https://bbb.example.com/bigbluebutton/api",
  secret: "test-secret",
  hash: "sha256" as const,
};

describe("BBBApi", () => {
  describe("createUrl", () => {
    it("appends checksum to URL params", () => {
      const api = new BBBApi(mockOptions);
      const params = new URLSearchParams({ meetingID: "test-123" });
      const url = api.createUrl("create" as never, params);

      expect(url).toContain("checksum=");
      expect(url).toContain("meetingID=test-123");
    });

    it("handles URL with trailing slash", () => {
      const api = new BBBApi({ ...mockOptions, url: "https://bbb.example.com/bigbluebutton/api/" });
      const params = new URLSearchParams();
      const url = api.createUrl("create" as never, params);

      expect(url).not.toContain("//create");
    });

    it("handles URL without trailing slash", () => {
      const api = new BBBApi({ ...mockOptions, url: "https://bbb.example.com/bigbluebutton/api" });
      const params = new URLSearchParams();
      const url = api.createUrl("create" as never, params);

      expect(url).toContain("bigbluebutton/api/create");
    });
  });

  describe("checkValidOptions", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("returns false when server is unreachable", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const api = new BBBApi(mockOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(false);
    });

    it("returns false when checksum is invalid", async () => {
      const invalidChecksumXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <returncode>FAILED</returncode>
  <messageKey>checksumError</messageKey>
  <message>Checksum is invalid</message>
</response>`;

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`<?xml version="1.0"?><response><returncode>SUCCESS</returncode><apiVersion>2.0</apiVersion></response>`),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(invalidChecksumXml),
        });

      const api = new BBBApi(mockOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(false);
    });

    it("returns true when server responds with a non-checksum server error (secret is valid)", async () => {
      const serverErrorXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <returncode>FAILED</returncode>
  <messageKey>missingParamMeetingID</messageKey>
  <message>Missing required parameter: meetingID</message>
</response>`;

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`<?xml version="1.0"?><response><returncode>SUCCESS</returncode><apiVersion>2.0</apiVersion></response>`),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(serverErrorXml),
        });

      const api = new BBBApi(mockOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(true);
    });

    it("returns false when API version is below 2.0", async () => {
      const oldVersionXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <returncode>SUCCESS</returncode>
  <apiVersion>1.0</apiVersion>
</response>`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(oldVersionXml),
      });

      const api = new BBBApi(mockOptions);
      const result = await api.checkValidOptions();

      expect(result).toBe(false);
    });
  });

  describe("createMeeting", () => {
    it("returns success with meeting data on valid response", async () => {
      const successXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <returncode>SUCCESS</returncode>
  <meetingID>test-meeting-123</meetingID>
  <internalMeetingID>abc123</internalMeetingID>
</response>`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(successXml),
      });

      const api = new BBBApi(mockOptions);
      const result = await api.createMeeting("test-meeting-123", "Test Meeting");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meetingID).toBe("test-meeting-123");
      }
    });

    it("returns error when server is unreachable", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const api = new BBBApi(mockOptions);
      const result = await api.createMeeting("test-meeting-123", "Test Meeting");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(bbbError.CANNOT_REACH_SERVER);
      }
    });
  });
});
