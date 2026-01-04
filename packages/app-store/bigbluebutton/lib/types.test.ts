import { expect, test, describe } from "vitest";

import {
  bbbOptionsSchema,
  bbbCreateMeetingSchema,
  bbbJoinMeetingSchema,
  bbbInstanceInfoSchema,
  bbbCreateMeetingResponseSchema,
  GuestPolicy,
  Role,
} from "./types";

describe("bbbOptionsSchema", () => {
  test("validates correct options", () => {
    const result = bbbOptionsSchema.safeParse({
      url: "https://bbb.example.com/bigbluebutton/api",
      secret: "my-secret-key",
      hash: "sha256",
    });
    expect(result.success).toBe(true);
  });

  test("accepts all hash algorithms", () => {
    const algorithms = ["sha1", "sha256", "sha384", "sha512"] as const;
    for (const hash of algorithms) {
      const result = bbbOptionsSchema.safeParse({
        url: "https://bbb.example.com/api",
        secret: "secret",
        hash,
      });
      expect(result.success).toBe(true);
    }
  });

  test("rejects invalid URL", () => {
    const result = bbbOptionsSchema.safeParse({
      url: "not-a-url",
      secret: "secret",
      hash: "sha256",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid hash algorithm", () => {
    const result = bbbOptionsSchema.safeParse({
      url: "https://bbb.example.com/api",
      secret: "secret",
      hash: "md5",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing fields", () => {
    const result = bbbOptionsSchema.safeParse({
      url: "https://bbb.example.com/api",
    });
    expect(result.success).toBe(false);
  });
});

describe("bbbCreateMeetingSchema", () => {
  test("validates minimal meeting creation", () => {
    const result = bbbCreateMeetingSchema.safeParse({
      meetingID: "meeting-123",
      name: "Test Meeting",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestPolicy).toBe(GuestPolicy.ALWAYS_ACCEPT);
      expect(result.data.allowRequestsWithoutSession).toBe(true);
    }
  });

  test("validates with custom guest policy", () => {
    const result = bbbCreateMeetingSchema.safeParse({
      meetingID: "meeting-123",
      name: "Test Meeting",
      guestPolicy: GuestPolicy.ASK_MODERATOR,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guestPolicy).toBe(GuestPolicy.ASK_MODERATOR);
    }
  });
});

describe("bbbJoinMeetingSchema", () => {
  test("validates join meeting request", () => {
    const result = bbbJoinMeetingSchema.safeParse({
      meetingID: "meeting-123",
      fullName: "John Doe",
      role: Role.MODERATOR,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.redirect).toBe(false);
    }
  });

  test("validates with optional fields", () => {
    const result = bbbJoinMeetingSchema.safeParse({
      meetingID: "meeting-123",
      fullName: "John Doe",
      role: Role.VIEWER,
      redirect: true,
      logoutURL: "https://example.com/logout",
      errorRedirectUrl: "https://example.com/error",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid role", () => {
    const result = bbbJoinMeetingSchema.safeParse({
      meetingID: "meeting-123",
      fullName: "John Doe",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("bbbInstanceInfoSchema", () => {
  test("validates BBB 2.0 response without GraphQL fields", () => {
    const result = bbbInstanceInfoSchema.safeParse({
      returncode: "SUCCESS",
      version: "2.0",
      apiVersion: "2.0",
    });
    expect(result.success).toBe(true);
  });

  test("validates BBB 2.5+ response with GraphQL fields", () => {
    const result = bbbInstanceInfoSchema.safeParse({
      returncode: "SUCCESS",
      version: "2.0",
      apiVersion: "2.5",
      bbbVersion: "2.7.0",
      graphqlWebsocketUrl: "wss://bbb.example.com/graphql",
      graphqlApiUrl: "https://bbb.example.com/api/rest",
    });
    expect(result.success).toBe(true);
  });

  test("validates with empty bbbVersion", () => {
    const result = bbbInstanceInfoSchema.safeParse({
      returncode: "SUCCESS",
      version: "2.0",
      apiVersion: "2.0",
      bbbVersion: "",
    });
    expect(result.success).toBe(true);
  });

  test("rejects FAILED returncode", () => {
    const result = bbbInstanceInfoSchema.safeParse({
      returncode: "FAILED",
      version: "2.0",
      apiVersion: "2.0",
    });
    expect(result.success).toBe(false);
  });
});

describe("bbbCreateMeetingResponseSchema", () => {
  test("validates successful create meeting response", () => {
    const result = bbbCreateMeetingResponseSchema.safeParse({
      returncode: "SUCCESS",
      meetingID: "meeting-123",
      internalMeetingID: "internal-123",
      parentMeetingID: "bbb-none",
      attendeePW: "ap",
      moderatorPW: "mp",
      createTime: 1749413782498,
      voiceBridge: 12345,
      dialNumber: "613-555-1234",
      createDate: "Sun Jun 08 20:16:22 UTC 2025",
      hasUserJoined: false,
      duration: 0,
      hasBeenForciblyEnded: false,
      messageKey: "",
      message: "",
    });
    expect(result.success).toBe(true);
  });
});
