import { describe, expect, test } from "vitest";

import {
  getConferenceDetailsFromResult,
  getPreferredConferenceResult,
  type ResultWithConferenceFields,
} from "./getConferenceDetailsFromResult";

const buildResult = (overrides: Partial<ResultWithConferenceFields>): ResultWithConferenceFields => {
  return {
    appName: "google_calendar",
    type: "google_calendar",
    success: true,
    uid: "result-uid",
    originalEvent: {} as ResultWithConferenceFields["originalEvent"],
    ...overrides,
  };
};

describe("getConferenceDetailsFromResult", () => {
  test("returns hangoutLink as meeting url when present", () => {
    const result = buildResult({
      createdEvent: {
        hangoutLink: "https://meet.google.com/aaa-bbbb-ccc",
      },
    });

    const details = getConferenceDetailsFromResult(result);
    expect(details.meetingUrl).toBe("https://meet.google.com/aaa-bbbb-ccc");
    expect(details.hangoutLink).toBe("https://meet.google.com/aaa-bbbb-ccc");
  });

  test("falls back to conferenceData video entry point when hangoutLink is missing", () => {
    const result = buildResult({
      createdEvent: {
        conferenceData: {
          entryPoints: [
            { entryPointType: "phone", uri: "tel:+12025550123" },
            { entryPointType: "video", uri: "https://meet.google.com/ddd-eeee-fff" },
          ],
        },
      },
    });

    const details = getConferenceDetailsFromResult(result);
    expect(details.meetingUrl).toBe("https://meet.google.com/ddd-eeee-fff");
    expect(details.hangoutLink).toBe("https://meet.google.com/ddd-eeee-fff");
  });
});

describe("getPreferredConferenceResult", () => {
  test("prefers google_calendar result over other successful results", () => {
    const videoResult = buildResult({
      type: "daily_video",
      appName: "daily-video",
      createdEvent: {
        url: "https://video.example.com/room",
      },
    });
    const googleResult = buildResult({
      type: "google_calendar",
      appName: "google_calendar",
      createdEvent: {
        hangoutLink: "https://meet.google.com/ggg-hhhh-iii",
      },
    });

    const preferred = getPreferredConferenceResult([videoResult, googleResult]);
    expect(preferred?.type).toBe("google_calendar");
  });
});
