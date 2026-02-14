import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../_utils/getAppKeysFromSlug", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    bookingReference: {
      findFirst: vi.fn(),
    },
  },
}));

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import BigBlueButtonVideoApiAdapter from "./VideoApiAdapter";

const mockedGetAppKeys = vi.mocked(getAppKeysFromSlug);

const fakeEvent = {
  title: "Test Meeting",
  type: "test",
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  organizer: { name: "Test", email: "test@example.com", timeZone: "UTC", language: { locale: "en" } },
  attendees: [],
} as any;

describe("BigBlueButtonVideoApiAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createMeeting", () => {
    it("throws when bbbUrl is not configured", async () => {
      mockedGetAppKeys.mockResolvedValue({});

      const adapter = BigBlueButtonVideoApiAdapter();
      await expect(adapter.createMeeting(fakeEvent)).rejects.toThrow(
        "BigBlueButton URL and secret must be configured"
      );
    });

    it("creates a meeting and returns join URL", async () => {
      mockedGetAppKeys.mockResolvedValue({
        bbbUrl: "https://bbb.example.com/bigbluebutton/",
        bbbSecret: "test-secret-123",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            '<response><returncode>SUCCESS</returncode><meetingID>abc</meetingID></response>'
          ),
      });

      const adapter = BigBlueButtonVideoApiAdapter();
      const result = await adapter.createMeeting(fakeEvent);

      expect(result.type).toBe("bigbluebutton_video");
      expect(result.id).toBeDefined();
      expect(result.url).toContain("bbb.example.com");
      expect(result.url).toContain("/join?");
      expect(result.url).toContain("fullName=");
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Verify the create URL was called with correct base
      const callUrl = (global.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain("/bigbluebutton/api/create?");
      expect(callUrl).toContain("checksum=");
    });

    it("throws on BBB API error response", async () => {
      mockedGetAppKeys.mockResolvedValue({
        bbbUrl: "https://bbb.example.com/bigbluebutton/",
        bbbSecret: "test-secret",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            "<response><returncode>FAILED</returncode><message>Checksums do not match</message></response>"
          ),
      });

      const adapter = BigBlueButtonVideoApiAdapter();
      await expect(adapter.createMeeting(fakeEvent)).rejects.toThrow("Checksums do not match");
    });

    it("throws on HTTP error", async () => {
      mockedGetAppKeys.mockResolvedValue({
        bbbUrl: "https://bbb.example.com/bigbluebutton/",
        bbbSecret: "test-secret",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      });

      const adapter = BigBlueButtonVideoApiAdapter();
      await expect(adapter.createMeeting(fakeEvent)).rejects.toThrow("502");
    });
  });

  describe("deleteMeeting", () => {
    it("does not throw when credentials are missing", async () => {
      mockedGetAppKeys.mockResolvedValue({});
      const adapter = BigBlueButtonVideoApiAdapter();
      await expect(adapter.deleteMeeting("some-id")).resolves.toBeUndefined();
    });

    it("calls the end API with moderator password from booking reference", async () => {
      mockedGetAppKeys.mockResolvedValue({
        bbbUrl: "https://bbb.example.com/bigbluebutton/",
        bbbSecret: "secret",
      });
      const prisma = await import("@calcom/prisma");
      (prisma.default.bookingReference.findFirst as any).mockResolvedValue({
        meetingId: "meeting-123",
        meetingPassword: "mod-password",
      });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("") });

      const adapter = BigBlueButtonVideoApiAdapter();
      await adapter.deleteMeeting("ref-uid");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callUrl = (global.fetch as any).mock.calls[0][0] as string;
      expect(callUrl).toContain("/end?");
      expect(callUrl).toContain("meetingID=meeting-123");
      expect(callUrl).toContain("password=mod-password");
    });

    it("skips end API when no moderator password found", async () => {
      mockedGetAppKeys.mockResolvedValue({
        bbbUrl: "https://bbb.example.com/bigbluebutton/",
        bbbSecret: "secret",
      });
      const prisma = await import("@calcom/prisma");
      (prisma.default.bookingReference.findFirst as any).mockResolvedValue(null);
      global.fetch = vi.fn();

      const adapter = BigBlueButtonVideoApiAdapter();
      await adapter.deleteMeeting("ref-uid");

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("updateMeeting", () => {
    it("returns existing booking reference data", async () => {
      const adapter = BigBlueButtonVideoApiAdapter();
      const result = await adapter.updateMeeting({
        meetingId: "m-123",
        meetingPassword: "pw",
        meetingUrl: "https://bbb.example.com/join/123",
      });
      expect(result.id).toBe("m-123");
      expect(result.url).toBe("https://bbb.example.com/join/123");
    });
  });

  describe("getAvailability", () => {
    it("returns empty array", async () => {
      const adapter = BigBlueButtonVideoApiAdapter();
      expect(await adapter.getAvailability()).toEqual([]);
    });
  });
});
