import { describe, expect, it } from "vitest";

import { deriveAppDictKeyFromType } from "./deriveAppDictKeyFromType";

describe("deriveAppDictKeyFromType", () => {
  it("returns exact match when appType exists in dict", () => {
    const dict = { zoom_video: "handler", google_calendar: "handler" };
    expect(deriveAppDictKeyFromType("zoom_video", dict)).toBe("zoom_video");
  });

  it("returns variant1 (prefix before last underscore) when exact match fails", () => {
    const dict = { zoom: "handler" };
    expect(deriveAppDictKeyFromType("zoom_video", dict)).toBe("zoom");
  });

  it("returns variant2 (remove last underscore) when variant1 fails", () => {
    const dict = { zoomvideo: "handler" };
    expect(deriveAppDictKeyFromType("zoom_video", dict)).toBe("zoomvideo");
  });

  it("returns variant3 (all underscores removed) as last resort", () => {
    const dict = { hubspotothercalendar: "handler" };
    expect(deriveAppDictKeyFromType("hubspot_other_calendar", dict)).toBe("hubspotothercalendar");
  });

  it("returns original appType when no variant matches", () => {
    const dict = { unrelated: "handler" };
    expect(deriveAppDictKeyFromType("nonexistent_app", dict)).toBe("nonexistent_app");
  });

  it("handles appType without underscores", () => {
    const dict = { dailyvideo: "handler" };
    expect(deriveAppDictKeyFromType("dailyvideo", dict)).toBe("dailyvideo");
  });

  it("prefers exact match over variants", () => {
    const dict = { zoom_video: "exact", zoom: "variant1", zoomvideo: "variant2" };
    expect(deriveAppDictKeyFromType("zoom_video", dict)).toBe("zoom_video");
  });

  it("prefers variant1 over variant2", () => {
    const dict = { zoom: "variant1", zoomvideo: "variant2" };
    expect(deriveAppDictKeyFromType("zoom_video", dict)).toBe("zoom");
  });

  it("handles closecom_other_calendar pattern", () => {
    const dict = { closecomothercalendar: "handler" };
    expect(deriveAppDictKeyFromType("closecom_other_calendar", dict)).toBe("closecomothercalendar");
  });

  it("handles empty dict", () => {
    expect(deriveAppDictKeyFromType("zoom_video", {})).toBe("zoom_video");
  });
});
