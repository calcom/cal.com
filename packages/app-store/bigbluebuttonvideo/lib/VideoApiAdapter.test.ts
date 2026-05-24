import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { v4 as uuidv4 } from "uuid";

import { callBbb } from "./bbbClient";
import BigBlueButtonVideoApiAdapter from "./VideoApiAdapter";

// Mock 依赖模块
vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn((text: string) => {
    if (text === "invalid") throw new Error("Decryption failed");
    return JSON.stringify({
      serverUrl: "https://bbb.example.com/bigbluebutton",
      sharedSecret: "test-secret",
    });
  }),
}));

vi.mock("@calcom/lib/url/buildUrl", () => ({
  buildUrl: vi.fn(
    ({ baseUrl, path, queryParams }: { baseUrl: string; path: string; queryParams: Record<string, string> }) =>
      `${baseUrl}${path}?${new URLSearchParams(queryParams).toString()}`
  ),
}));

vi.mock("../../_utils/getAppKeysFromSlug", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("./bbbClient", () => ({
  callBbb: vi.fn(),
  generateMeetingPassword: vi.fn(() => "abcdef1234567890abcdef1234567890"),
}));

// 模拟 credential 对象
const mockCredential = {
  id: 1,
  appId: "bigbluebutton",
  key: "encrypted-key-value",
  teamId: null,
  userId: 1,
};

// UUID 固定值
vi.mock("uuid", () => ({
  v4: vi.fn(() => "fixed-uuid-1234"),
}));

describe("BigBlueButtonVideoApiAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CALENDSO_ENCRYPTION_KEY = "32-byte-encryption-key-for-test";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createMeeting", () => {
    it("应该成功创建 BBB 会议并返回加入 URL", async () => {
      const adapter = BigBlueButtonVideoApiAdapter(mockCredential);
      const event = {
        uid: "event-uid-001",
        title: "Team Standup",
        startTime: "2024-01-01T09:00:00Z",
        endTime: "2024-01-01T10:00:00Z",
        organizer: { name: "Organizer", email: "org@example.com" },
        attendees: [{ name: "Attendee", email: "att@example.com" }],
        type: "meeting",
      };

      const result = await adapter!.createMeeting!(event);

      expect(callBbb).toHaveBeenCalledWith(
        "https://bbb.example.com/bigbluebutton",
        "create",
        expect.stringContaining("meetingID=bigbluebutton-event-uid-001"),
        "test-secret"
      );

      expect(result.type).toBe("bigbluebutton_video");
      expect(result.id).toBe("bigbluebutton-event-uid-001");
      expect(result.url).toContain("/api/join");
      expect(result.url).toContain("meetingID=bigbluebutton-event-uid-001");
    });

    it("解密失败时应该抛出错误（错误路径测试）", async () => {
      const badCredential = { ...mockCredential, key: "invalid" };
      const adapter = BigBlueButtonVideoApiAdapter(badCredential);

      await expect(
        adapter!.createMeeting!({
          uid: "e1",
          title: "Test",
          startTime: "2024-01-01T09:00:00Z",
          endTime: "2024-01-01T10:00:00Z",
          organizer: { name: "O", email: "o@e.com" },
          attendees: [],
          type: "meeting",
        })
      ).rejects.toThrow("Decryption failed");
    });

    it("BBB API 返回 FAILED 时应该抛出错误（错误路径测试）", async () => {
      vi.mocked(callBbb).mockRejectedValueOnce(new Error("BBB API error"));
      const adapter = BigBlueButtonVideoApiAdapter(mockCredential);

      await expect(
        adapter!.createMeeting!({
          uid: "e1",
          title: "Test",
          startTime: "2024-01-01T09:00:00Z",
          endTime: "2024-01-01T10:00:00Z",
          organizer: { name: "O", email: "o@e.com" },
          attendees: [],
          type: "meeting",
        })
      ).rejects.toThrow("BBB API error");
    });
  });

  describe("getAvailability", () => {
    it("应该返回空数组", async () => {
      const adapter = BigBlueButtonVideoApiAdapter(mockCredential);
      const result = await adapter!.getAvailability!();
      expect(result).toEqual([]);
    });
  });

  describe("updateMeeting", () => {
    it("应该更新已存在的会议并返回新的加入 URL", async () => {
      const adapter = BigBlueButtonVideoApiAdapter(mockCredential);
      const bookingRef = {
        meetingId: "bigbluebutton-event-uid-001",
        meetingPassword: "moderator-pw",
        meetingUrl: "https://old.url",
      };

      const result = await adapter!.updateMeeting!(bookingRef, {
        uid: "event-uid-001",
        title: "Updated Meeting",
        startTime: "2024-01-01T09:00:00Z",
        endTime: "2024-01-01T10:00:00Z",
        organizer: { name: "O", email: "o@e.com" },
        attendees: [],
        type: "meeting",
      });

      expect(callBbb).toHaveBeenCalledWith(
        "https://bbb.example.com/bigbluebutton",
        "create",
        expect.stringContaining("meetingID=bigbluebutton-event-uid-001"),
        "test-secret"
      );
      expect(result.type).toBe("bigbluebutton_video");
    });
  });

  describe("缺少 CALENDSO_ENCRYPTION_KEY 环境变量", () => {
    it("应该抛出描述性错误", async () => {
      delete process.env.CALENDSO_ENCRYPTION_KEY;
      const adapter = BigBlueButtonVideoApiAdapter(mockCredential);

      await expect(
        adapter!.createMeeting!({
          uid: "e1",
          title: "Test",
          startTime: "2024-01-01T09:00:00Z",
          endTime: "2024-01-01T10:00:00Z",
          organizer: { name: "O", email: "o@e.com" },
          attendees: [],
          type: "meeting",
        })
      ).rejects.toThrow("CALENDSO_ENCRYPTION_KEY");
    });
  });
});