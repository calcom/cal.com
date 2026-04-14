import { describe, expect, it } from "vitest";

import { getCrmEventLocationInfoForLogging, isVideoIntegrationLocation } from "./get-crm-event-location-info";

describe("getCrmEventLocationInfoForLogging", () => {
  it("returns isProperUrl=true for a Google Meet URL with videoCallData", () => {
    const result = getCrmEventLocationInfoForLogging({
      videoCallData: { type: "google_video", url: "https://meet.google.com/abc-defg-hij" },
      location: "integrations:google:meet",
    });
    expect(result.isProperUrl).toBe(true);
    expect(result.resolvedLocation).toBe("https://meet.google.com/abc-defg-hij");
    expect(result.hasVideoCallData).toBe(true);
    expect(result.videoCallDataType).toBe("google_video");
    expect(result.videoCallDataUrl).toBe("https://meet.google.com/abc-defg-hij");
    expect(result.isVideoIntegrationLocation).toBe(true);
  });

  it("returns isProperUrl=true for a Zoom URL with videoCallData", () => {
    const result = getCrmEventLocationInfoForLogging({
      videoCallData: { type: "zoom_video", url: "https://zoom.us/j/123456789" },
      location: "integrations:zoom",
    });
    expect(result.isProperUrl).toBe(true);
    expect(result.resolvedLocation).toBe("https://zoom.us/j/123456789");
  });

  it("returns isProperUrl=false and resolvedLocation='Google' when videoCallData is missing (race condition)", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: "integrations:google:meet",
    });
    expect(result.isProperUrl).toBe(false);
    expect(result.resolvedLocation).toBe("Google");
    expect(result.hasVideoCallData).toBe(false);
    expect(result.videoCallDataType).toBe(null);
    expect(result.videoCallDataUrl).toBe(null);
    expect(result.rawLocation).toBe("integrations:google:meet");
    expect(result.isVideoIntegrationLocation).toBe(true);
  });

  it("returns isProperUrl=false and resolvedLocation='Zoom' when videoCallData is missing for zoom", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: "integrations:zoom",
    });
    expect(result.isProperUrl).toBe(false);
    expect(result.resolvedLocation).toBe("Zoom");
  });

  it("returns isProperUrl=false and resolvedLocation=null when location is empty", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: "",
    });
    expect(result.isProperUrl).toBe(false);
    expect(result.resolvedLocation).toBe(null);
    expect(result.rawLocation).toBe("");
  });

  it("returns isProperUrl=false and resolvedLocation=null when location is null", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: null,
    });
    expect(result.isProperUrl).toBe(false);
    expect(result.resolvedLocation).toBe(null);
    expect(result.rawLocation).toBe(null);
  });

  it("returns isProperUrl=false and resolvedLocation=null when location is undefined", () => {
    const result = getCrmEventLocationInfoForLogging({});
    expect(result.isProperUrl).toBe(false);
    expect(result.resolvedLocation).toBe(null);
    expect(result.rawLocation).toBe(null);
    expect(result.isVideoIntegrationLocation).toBe(false);
  });

  it("returns isProperUrl=true for a Cal.com booking link as location", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: "https://cal.com/user/event",
    });
    expect(result.isProperUrl).toBe(true);
    expect(result.resolvedLocation).toBe("https://cal.com/user/event");
    expect(result.isVideoIntegrationLocation).toBe(false);
  });

  it("returns isProperUrl=true when videoCallData has url but type is missing", () => {
    const result = getCrmEventLocationInfoForLogging({
      videoCallData: { url: "https://meet.google.com/abc" },
      location: "integrations:google:meet",
    });
    expect(result.isProperUrl).toBe(true);
    expect(result.resolvedLocation).toBe("https://meet.google.com/abc");
    expect(result.videoCallDataType).toBe(null);
  });

  it("returns isProperUrl=false when videoCallData exists but url is empty", () => {
    const result = getCrmEventLocationInfoForLogging({
      videoCallData: { type: "google_video", url: "" },
      location: "integrations:google:meet",
    });
    expect(result.isProperUrl).toBe(false);
    expect(result.resolvedLocation).toBe("Google");
    expect(result.hasVideoCallData).toBe(true);
    expect(result.videoCallDataUrl).toBe("");
  });

  it("returns isProperUrl=false and 'Cal Video' for daily integration without videoCallData", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: "integrations:daily",
    });
    expect(result.isProperUrl).toBe(false);
    expect(result.resolvedLocation).toBe("Cal Video");
  });

  it("returns isProperUrl=true when hangoutLink is set and videoCallData is missing", () => {
    const result = getCrmEventLocationInfoForLogging({
      additionalInformation: { hangoutLink: "https://meet.google.com/xyz-abcd-efg" },
      location: "integrations:google:meet",
    });
    expect(result.isProperUrl).toBe(true);
    expect(result.resolvedLocation).toBe("https://meet.google.com/xyz-abcd-efg");
    expect(result.hasVideoCallData).toBe(false);
    expect(result.hangoutLink).toBe("https://meet.google.com/xyz-abcd-efg");
  });

  it("prefers videoCallData over hangoutLink when both are present", () => {
    const result = getCrmEventLocationInfoForLogging({
      videoCallData: { type: "google_video", url: "https://meet.google.com/from-video-call-data" },
      additionalInformation: { hangoutLink: "https://meet.google.com/from-hangout-link" },
      location: "integrations:google:meet",
    });
    expect(result.isProperUrl).toBe(true);
    expect(result.resolvedLocation).toBe("https://meet.google.com/from-video-call-data");
    expect(result.hangoutLink).toBe("https://meet.google.com/from-hangout-link");
  });

  it("returns hangoutLink=null when additionalInformation has no hangoutLink", () => {
    const result = getCrmEventLocationInfoForLogging({
      additionalInformation: {},
      location: "integrations:google:meet",
    });
    expect(result.isProperUrl).toBe(false);
    expect(result.hangoutLink).toBe(null);
  });

  it("returns isVideoIntegrationLocation=false for phone location", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: "phone",
    });
    expect(result.isVideoIntegrationLocation).toBe(false);
  });

  it("returns isVideoIntegrationLocation=false for inPerson location", () => {
    const result = getCrmEventLocationInfoForLogging({
      location: "inPerson",
    });
    expect(result.isVideoIntegrationLocation).toBe(false);
  });
});

describe("isVideoIntegrationLocation", () => {
  it("returns true for integrations:google:meet", () => {
    expect(isVideoIntegrationLocation("integrations:google:meet")).toBe(true);
  });

  it("returns true for integrations:zoom", () => {
    expect(isVideoIntegrationLocation("integrations:zoom")).toBe(true);
  });

  it("returns true for integrations:daily", () => {
    expect(isVideoIntegrationLocation("integrations:daily")).toBe(true);
  });

  it("returns true for integrations:office365_video", () => {
    expect(isVideoIntegrationLocation("integrations:office365_video")).toBe(true);
  });

  it("returns false for phone", () => {
    expect(isVideoIntegrationLocation("phone")).toBe(false);
  });

  it("returns false for inPerson", () => {
    expect(isVideoIntegrationLocation("inPerson")).toBe(false);
  });

  it("returns false for a URL string", () => {
    expect(isVideoIntegrationLocation("https://whereby.com/my-room")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isVideoIntegrationLocation(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isVideoIntegrationLocation(undefined)).toBe(false);
  });
});
