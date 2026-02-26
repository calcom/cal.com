import { describe, expect, it } from "vitest";

import type { AppMeta } from "@calcom/types/App";

import { shouldRedirectToAppOnboarding } from "./shouldRedirectToAppOnboarding";

describe("shouldRedirectToAppOnboarding", () => {
  it("returns true when extendsFeature is 'EventType'", () => {
    const meta = { extendsFeature: "EventType" } as AppMeta;
    expect(shouldRedirectToAppOnboarding(meta)).toBe(true);
  });

  it("returns false when extendsFeature is 'User'", () => {
    const meta = { extendsFeature: "User" } as AppMeta;
    expect(shouldRedirectToAppOnboarding(meta)).toBe(false);
  });

  it("returns false when extendsFeature is undefined", () => {
    const meta = {} as AppMeta;
    expect(shouldRedirectToAppOnboarding(meta)).toBe(false);
  });

  it("returns undefined (falsy) when appMetadata itself has no extendsFeature key", () => {
    const meta = { name: "test-app" } as AppMeta;
    expect(shouldRedirectToAppOnboarding(meta)).toBeFalsy();
  });
});
