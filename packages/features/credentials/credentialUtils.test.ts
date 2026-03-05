import { AppCategories } from "@calcom/prisma/enums";
import { describe, expect, test } from "vitest";
import {
  getRemovedIntegrationNameFromAppSlug,
  isVideoOrConferencingApp,
  removeAppFromEventTypeMetadata,
} from "./credentialUtils";

describe("isVideoOrConferencingApp", () => {
  test("scenario 6: returns true for app with video category", () => {
    const app = { categories: [AppCategories.video], slug: "zoom", dirName: "zoom" };
    expect(isVideoOrConferencingApp(app)).toBe(true);
  });

  test("scenario 7: returns true for app with conferencing category", () => {
    const app = { categories: [AppCategories.conferencing], slug: "meet", dirName: "meet" };
    expect(isVideoOrConferencingApp(app)).toBe(true);
  });

  test("scenario 8: returns false for app with neither category", () => {
    const app = { categories: [AppCategories.calendar], slug: "gcal", dirName: "gcal" };
    expect(isVideoOrConferencingApp(app)).toBeFalsy();
  });

  test("scenario 9: returns falsy for null app", () => {
    expect(isVideoOrConferencingApp(null)).toBeFalsy();
  });
});

describe("getRemovedIntegrationNameFromAppSlug", () => {
  test("scenario 10: MS Teams special case returns office365_video", () => {
    expect(getRemovedIntegrationNameFromAppSlug("msteams")).toBe("office365_video");
  });

  test("scenario 11: regular app slug returns slug split on dash, take first", () => {
    expect(getRemovedIntegrationNameFromAppSlug("zoomvideo")).toBe("zoomvideo");
  });

  test("scenario 12: app with dash returns first segment", () => {
    expect(getRemovedIntegrationNameFromAppSlug("google-meet")).toBe("google");
  });
});

describe("removeAppFromEventTypeMetadata", () => {
  test("scenario 13: removes target app from metadata", () => {
    const result = removeAppFromEventTypeMetadata("stripe", {
      apps: { stripe: { enabled: true } as never, zoom: { enabled: true } as never },
    });
    expect(result).toEqual({ zoom: { enabled: true } });
    expect(result).not.toHaveProperty("stripe");
  });

  test("scenario 14: empty apps object returns empty", () => {
    const result = removeAppFromEventTypeMetadata("stripe", { apps: {} });
    expect(result).toEqual({});
  });

  test("scenario 15: undefined apps returns empty", () => {
    const result = removeAppFromEventTypeMetadata("stripe", { apps: undefined });
    expect(result).toEqual({});
  });

  test("scenario 16: app not in metadata returns unchanged", () => {
    const result = removeAppFromEventTypeMetadata("stripe", {
      apps: { zoom: { enabled: true } as never },
    });
    expect(result).toEqual({ zoom: { enabled: true } });
  });

  test("scenario 17: removing single app leaves empty object", () => {
    const result = removeAppFromEventTypeMetadata("stripe", {
      apps: { stripe: { enabled: true } as never },
    });
    expect(result).toEqual({});
  });
});
