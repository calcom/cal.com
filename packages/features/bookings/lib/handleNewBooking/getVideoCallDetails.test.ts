import { describe, expect, it } from "vitest";
import { getVideoCallDetails } from "./getVideoCallDetails";

type VideoResult = Parameters<typeof getVideoCallDetails>[0]["results"][number];

function makeVideoResult(overrides: Partial<VideoResult> = {}): VideoResult {
  return {
    type: "daily_video",
    appName: "Daily.co",
    success: true,
    createdEvent: undefined,
    updatedEvent: undefined,
    originalEvent: undefined,
    ...overrides,
  } as VideoResult;
}

describe("getVideoCallDetails", () => {
  it("returns videoCallUrl from hangoutLink when present", () => {
    const result = makeVideoResult({
      type: "google_calendar_video",
      updatedEvent: {
        hangoutLink: "https://meet.google.com/abc-def-ghi",
        conferenceData: undefined,
        entryPoints: undefined,
      },
    });

    const { videoCallUrl } = getVideoCallDetails({ results: [result] });
    expect(videoCallUrl).toBe("https://meet.google.com/abc-def-ghi");
  });

  it("returns videoCallUrl from updatedEvent.url when hangoutLink is absent", () => {
    const result = makeVideoResult({
      type: "daily_video",
      updatedEvent: {
        url: "https://daily.co/room123",
        hangoutLink: undefined,
        conferenceData: undefined,
        entryPoints: undefined,
      },
    });

    const { videoCallUrl } = getVideoCallDetails({ results: [result] });
    expect(videoCallUrl).toBe("https://daily.co/room123");
  });

  it("returns undefined videoCallUrl when no video result exists", () => {
    const result = makeVideoResult({
      type: "google_calendar",
      success: true,
    });

    const { videoCallUrl } = getVideoCallDetails({ results: [result] });
    expect(videoCallUrl).toBeUndefined();
  });

  it("returns undefined videoCallUrl when video result was not successful", () => {
    const result = makeVideoResult({
      type: "daily_video",
      success: false,
    });

    const { videoCallUrl } = getVideoCallDetails({ results: [result] });
    expect(videoCallUrl).toBeUndefined();
  });

  it("extracts metadata from the video event", () => {
    const conferenceData = { conferenceId: "123" };
    const entryPoints = [{ entryPointType: "video", uri: "https://meet.google.com/abc" }];

    const result = makeVideoResult({
      type: "zoom_video",
      updatedEvent: {
        hangoutLink: "https://zoom.us/j/123",
        conferenceData,
        entryPoints,
      },
    });

    const { metadata } = getVideoCallDetails({ results: [result] });
    expect(metadata).toMatchObject({
      hangoutLink: "https://zoom.us/j/123",
      conferenceData,
      entryPoints,
    });
  });

  it("handles updatedEvent as an array", () => {
    const result = makeVideoResult({
      type: "daily_video",
      updatedEvent: [
        {
          url: "https://daily.co/first-room",
          hangoutLink: undefined,
          conferenceData: undefined,
          entryPoints: undefined,
        },
      ],
    });

    const { videoCallUrl } = getVideoCallDetails({ results: [result] });
    expect(videoCallUrl).toBe("https://daily.co/first-room");
  });

  it("returns empty metadata when no video results", () => {
    const { metadata } = getVideoCallDetails({ results: [] });
    expect(metadata).toEqual({});
  });
});
