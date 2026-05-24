import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { expect, test, vi, describe } from "vitest";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { internalServerErrorResponse, successResponse } from "../../_utils/testUtils";
import config from "../config.json";
import VideoApiAdapter from "./VideoApiAdapter";

const MEETING_ID = "FAKE_MEETING_ID";

const URLS = {
  CREATE_MEETING: {
    url: "https://graph.microsoft.com/v1.0/me/onlineMeetings",
    method: "POST",
  },
  UPDATE_MEETING: {
    url: `https://graph.microsoft.com/v1.0/me/onlineMeetings/${MEETING_ID}`,
    method: "PATCH",
  },
  DELETE_MEETING: {
    url: `https://graph.microsoft.com/v1.0/me/onlineMeetings/${MEETING_ID}`,
    method: "DELETE",
  },
};

vi.mock("../../_utils/getParsedAppKeysFromSlug", () => ({
  default: vi.fn().mockImplementation((slug) => {
    if (slug !== config.slug) {
      throw new Error(
        `expected to be called with the correct slug. Expected ${config.slug} -  Received ${slug}`
      );
    }
    return {
      client_id: "FAKE_CLIENT_ID",
      client_secret: "FAKE_CLIENT_SECRET",
    };
  }),
}));

const mockRequestRaw = vi.fn();
vi.mock("../../_utils/oauth/OAuthManager", () => ({
  OAuthManager: vi.fn().mockImplementation(function() {
    return { requestRaw: mockRequestRaw };
  }),
}));

const testCredential = {
  appId: config.slug,
  id: 1,
  invalid: false,
  key: {
    scope: "https://www.googleapis.com/auth/calendar.events",
    token_type: "Bearer",
    expiry_date: 1625097600000,
    access_token: "",
    refresh_token: "",
  },
  type: config.type,
  userId: 1,
  user: { email: "example@cal.com" },
  teamId: 1,
  delegatedTo: null,
  delegationCredentialId: null,
  encryptedKey: null,
};

const testEvent = {
  title: "Test Meeting",
  description: "Test Description",
  startTime: new Date(),
  endTime: new Date(),
};

const testBookingRef = {
  type: "office365_video",
  uid: "FAKE_UID",
  meetingId: MEETING_ID,
  meetingUrl: "https://existing_join_url.example.com",
};

// ─── createMeeting ────────────────────────────────────────────────────────────

describe("createMeeting", () => {
  test("Successful `createMeeting` call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 1,
              joinWebUrl: "https://join_web_url.example.com",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const createdMeeting = await videoApi?.createMeeting(testEvent);

    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.CREATE_MEETING.url,
      options: {
        method: "POST",
        body: JSON.stringify({
          startDateTime: testEvent.startTime,
          endDateTime: testEvent.endTime,
          subject: testEvent.title,
        }),
      },
    });
    expect(createdMeeting).toEqual({
      id: 1,
      password: "",
      type: "office365_video",
      url: "https://join_web_url.example.com",
    });
  });

  test("`createMeeting` fails when joinWebUrl is missing from Graph response", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 1,
              // joinWebUrl intentionally missing → triggers the validation error
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    await expect(() => videoApi?.createMeeting(testEvent)).rejects.toThrowError(
      "Error creating MS Teams meeting"
    );
  });

  test("Failing `createMeeting` call — server error", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(internalServerErrorResponse({ json: {} }));
      }
      throw new Error("Unexpected URL");
    });

    await expect(() => videoApi?.createMeeting(testEvent)).rejects.toThrowError("Internal Server Error");
  });
});

// ─── updateMeeting ────────────────────────────────────────────────────────────

describe("updateMeeting", () => {
  test("Successful `updateMeeting` uses PATCH /onlineMeetings/{meetingId}", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.UPDATE_MEETING.url && options.method === "PATCH") {
        return Promise.resolve(
          successResponse({
            json: {
              id: MEETING_ID,
              joinWebUrl: "https://updated_join_web_url.example.com",
            },
          })
        );
      }
      throw new Error(`Unexpected request: ${options.method} ${url}`);
    });

    const updatedMeeting = await videoApi?.updateMeeting(testBookingRef, testEvent);

    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.UPDATE_MEETING.url,
      options: {
        method: "PATCH",
        body: JSON.stringify({
          startDateTime: testEvent.startTime,
          endDateTime: testEvent.endTime,
          subject: testEvent.title,
        }),
      },
    });
    expect(updatedMeeting).toEqual({
      id: MEETING_ID,
      password: "",
      type: "office365_video",
      url: "https://updated_join_web_url.example.com",
    });
  });

  test("`updateMeeting` falls back to createMeeting when meetingId is missing", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: "NEW_MEETING_ID",
              joinWebUrl: "https://new_join_web_url.example.com",
            },
          })
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const bookingRefWithoutMeetingId = { ...testBookingRef, meetingId: null };
    const result = await videoApi?.updateMeeting(bookingRefWithoutMeetingId, testEvent);

    // Should have fallen back to POST /onlineMeetings via adapter.createMeeting()
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.CREATE_MEETING.url,
      options: expect.objectContaining({ method: "POST" }),
    });
    expect(result?.url).toBe("https://new_join_web_url.example.com");
  });

  test("Failing `updateMeeting` — server error propagates correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.UPDATE_MEETING.url && options.method === "PATCH") {
        return Promise.resolve(internalServerErrorResponse({ json: {} }));
      }
      throw new Error(`Unexpected request: ${options.method} ${url}`);
    });

    await expect(() => videoApi?.updateMeeting(testBookingRef, testEvent)).rejects.toThrowError(
      "Internal Server Error"
    );
  });
});

// ─── deleteMeeting ────────────────────────────────────────────────────────────

describe("deleteMeeting", () => {
  test("Successful `deleteMeeting` calls DELETE /onlineMeetings/{uid}", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url, options }) => {
      if (url === URLS.DELETE_MEETING.url && options.method === "DELETE") {
        return Promise.resolve(successResponse({ json: {} }));
      }
      throw new Error(`Unexpected request: ${options.method} ${url}`);
    });

    await expect(videoApi?.deleteMeeting(MEETING_ID)).resolves.toBeUndefined();

    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.DELETE_MEETING.url,
      options: { method: "DELETE" },
    });
  });

  test("`deleteMeeting` ignores 404 — meeting already gone", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(() => {
      return Promise.resolve({ ok: false, status: 404, statusText: "Not Found" });
    });

    // Should NOT throw when 404 — idempotent delete
    await expect(videoApi?.deleteMeeting(MEETING_ID)).resolves.toBeUndefined();
  });

  test("Failing `deleteMeeting` — server error propagates correctly", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(() => {
      return Promise.resolve(internalServerErrorResponse({ json: {} }));
    });

    await expect(() => videoApi?.deleteMeeting(MEETING_ID)).rejects.toThrowError("Internal Server Error");
  });
});
