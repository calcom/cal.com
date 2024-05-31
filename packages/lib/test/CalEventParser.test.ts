import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";

import {
  getLocation,
  getPublicVideoCallUrl,
  getVideoCallPassword,
  getVideoCallUrlFromCalEvent,
} from "../CalEventParser";
import { buildCalendarEvent, buildVideoCallData } from "./builder";

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "http://localhost:3000",
  APP_NAME: "Cal.com",
}));

vi.mock("short-uuid", () => ({
  __esModule: true,
  default: () => ({ fromUUID: () => "FAKE_UUID" }),
}));

describe("getLocation", () => {
  it("should return a meetingUrl for video call meetings", () => {
    const calEvent = buildCalendarEvent({
      videoCallData: buildVideoCallData({
        type: "daily_video",
      }),
    });

    expect(getLocation(calEvent)).toEqual(getVideoCallUrlFromCalEvent(calEvent));
  });
  it("should return an integration provider name from event", () => {
    const provideName = "Cal.com";
    const calEvent = buildCalendarEvent({
      videoCallData: undefined,
      location: `integrations:${provideName}`,
    });

    expect(getLocation(calEvent)).toEqual(provideName);
  });
  it("should return a real-world location from event", () => {
    const calEvent = buildCalendarEvent({
      videoCallData: undefined,
      location: faker.address.streetAddress(true),
    });

    expect(getLocation(calEvent)).toEqual(calEvent.location);
  });
});

describe("getVideoCallUrl", () => {
  it("should return an app public url instead of meeting url for daily call meetings", () => {
    const calEvent = buildCalendarEvent({
      videoCallData: buildVideoCallData({
        type: "daily_video",
      }),
    });

    expect(getVideoCallUrlFromCalEvent(calEvent)).toEqual(getPublicVideoCallUrl(calEvent));
  });
});

describe("getVideoCallPassword", () => {
  it("should return an empty password for daily call meetings", () => {
    const calEvent = buildCalendarEvent({
      videoCallData: buildVideoCallData({
        type: "daily_video",
      }),
    });

    expect(getVideoCallPassword(calEvent)).toEqual("");
  });
  it("should return original password for other video call meetings", () => {
    const calEvent = buildCalendarEvent();

    expect(calEvent?.videoCallData?.type).not.toBe("daily_video");
    expect(getVideoCallPassword(calEvent)).toEqual(calEvent?.videoCallData.password);
  });
});
