import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { expect, test, vi, describe } from "vitest";

import { OAuthManager } from "../../_utils/oauth/OAuthManager";
import { internalServerErrorResponse, successResponse } from "../../_utils/testUtils";
import config from "../config.json";
import VideoApiAdapter from "./VideoApiAdapter";

const FAKE_MEETING_ID = "FAKE_MEETING_ID";
const FAKE_BOOKING_REF = { type: "office365_video", uid: "FAKE_UID", meetingId: FAKE_MEETING_ID };

const URLS = {
  CREATE_MEETING: {
    url: "https://graph.microsoft.com/v1.0/me/onlineMeetings",
    method: "POST",
  },
  UPDATE_MEETING: {
    url: `https://graph.microsoft.com/v1.0/me/onlineMeetings/${FAKE_MEETING_ID}`,
    method: "PATCH",
  },
  DELETE_MEETING: {
    url: `https://graph.microsoft.com/v1.0/me/onlineMeetings/${FAKE_MEETING_ID}`,
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
              joinUrl: "https://join_url.example.com",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };

    const createdMeeting = await videoApi?.createMeeting(event);
    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.CREATE_MEETING.url,
      options: {
        method: "POST",
        body: JSON.stringify({
          startDateTime: event.startTime,
          endDateTime: event.endTime,
          subject: event.title,
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

  test(" `createMeeting` when there is no joinWebUrl and only joinUrl", async () => {

    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: 1,
              joinUrl: "https://join_url.example.com",
              error: {
                message: "ERROR",
              },
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };

    await expect(() => videoApi?.createMeeting(event)).rejects.toThrowError(
      "Error creating MS Teams meeting"
    );
    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.CREATE_MEETING.url,
      options: {
        method: "POST",
        body: JSON.stringify({
          startDateTime: event.startTime,
          endDateTime: event.endTime,
          subject: event.title,
        }),
      },
    });
  });

  test("Failing `createMeeting` call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.CREATE_MEETING.url) {
        return Promise.resolve(
          internalServerErrorResponse({
            json: {
              id: 1,
              joinWebUrl: "https://example.com",
              joinUrl: "https://example.com",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };

    await expect(() => videoApi?.createMeeting(event)).rejects.toThrowError("Internal Server Error");
    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.CREATE_MEETING.url,
      options: {
        method: "POST",
        body: JSON.stringify({
          startDateTime: event.startTime,
          endDateTime: event.endTime,
          subject: event.title,
        }),
      },
    });
  });
});

describe("updateMeeting", () => {
  test("Successful `updateMeeting` call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.UPDATE_MEETING.url) {
        return Promise.resolve(
          successResponse({
            json: {
              id: FAKE_MEETING_ID,
              joinWebUrl: "https://join_web_url.example.com",
              joinUrl: "https://join_url.example.com",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };

    const updatedMeeting = await videoApi?.updateMeeting(FAKE_BOOKING_REF, event);
    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.UPDATE_MEETING.url,
      options: {
        method: "PATCH",
        body: JSON.stringify({
          startDateTime: event.startTime,
          endDateTime: event.endTime,
          subject: event.title,
        }),
      },
    });
    expect(updatedMeeting).toEqual({
      id: FAKE_MEETING_ID,
      password: "",
      type: config.type,
      url: "https://join_web_url.example.com",
    });
  });

  test("Failing `updateMeeting` call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.UPDATE_MEETING.url) {
        return Promise.resolve(
          internalServerErrorResponse({
            json: {
              id: FAKE_MEETING_ID,
              joinWebUrl: "https://join_web_url.example.com",
              joinUrl: "https://join_url.example.com",
            },
          })
        );
      }
      throw new Error("Unexpected URL");
    });

    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };

    await expect(() => videoApi?.updateMeeting(FAKE_BOOKING_REF, event)).rejects.toThrowError(
      "Internal Server Error"
    );
    expect(OAuthManager).toHaveBeenCalled();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.UPDATE_MEETING.url,
      options: {
        method: "PATCH",
        body: JSON.stringify({
          startDateTime: event.startTime,
          endDateTime: event.endTime,
          subject: event.title,
        }),
      },
    });
  });

  test("`updateMeeting` throws when meetingId is missing", async () => {
    const videoApi = VideoApiAdapter(testCredential);
    const event = {
      title: "Test Meeting",
      description: "Test Description",
      startTime: new Date(),
      endTime: new Date(),
    };
    await expect(() =>
      videoApi?.updateMeeting({ type: "office365_video", uid: "uid", meetingId: null }, event)
    ).rejects.toThrowError("Meeting ID is required");
  });
});

describe("deleteMeeting", () => {
  test("Successful `deleteMeeting` call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.DELETE_MEETING.url) {
        return Promise.resolve(successResponse({ json: {} }));
      }
      throw new Error("Unexpected URL");
    });

    await expect(videoApi?.deleteMeeting(FAKE_MEETING_ID)).resolves.toBeDefined();
    expect(mockRequestRaw).toHaveBeenCalledWith({
      url: URLS.DELETE_MEETING.url,
      options: { method: "DELETE" },
    });
  });

  test("`deleteMeeting` is idempotent on 404", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 404, statusText: "Not Found", text: async () => "" })
    );

    await expect(videoApi?.deleteMeeting(FAKE_MEETING_ID)).resolves.toBeDefined();
  });

  test("Failing `deleteMeeting` call", async () => {
    const videoApi = VideoApiAdapter(testCredential);

    mockRequestRaw.mockImplementation(({ url }) => {
      if (url === URLS.DELETE_MEETING.url) {
        return Promise.resolve(internalServerErrorResponse({ json: {} }));
      }
      throw new Error("Unexpected URL");
    });

    await expect(() => videoApi?.deleteMeeting(FAKE_MEETING_ID)).rejects.toThrowError(
      "Internal Server Error"
    );
  });
});
