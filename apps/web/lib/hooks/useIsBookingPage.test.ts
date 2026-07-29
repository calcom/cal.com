import { describe, expect, it } from "vitest";
import { isBookingPath } from "./useIsBookingPage";

describe("isBookingPath", () => {
  it.each(["/rick", "/john+jane", "/rick/30min"])("detects the dynamic booking path %s", (pathname) => {
    expect(isBookingPath(pathname)).toBe(true);
  });

  it.each([
    "/booking/123",
    "/reschedule/123",
    "/team/acme",
    "/d/private-link",
  ])("keeps detecting the known booking path %s", (pathname) => {
    expect(isBookingPath(pathname)).toBe(true);
  });

  it.each([
    "/settings",
    "/settings/profile",
    "/event-types",
    "/api/auth",
    "/apps/installed",
  ])("does not classify the reserved application path %s as a booking page", (pathname) => {
    expect(isBookingPath(pathname)).toBe(false);
  });

  it.each(["/upcoming", "/unconfirmed", "/recurring", "/cancelled", "/past"])(
    "does not classify the booking-list path %s as a booking page",
    (pathname) => {
      expect(isBookingPath(pathname)).toBe(false);
    }
  );

  it("matches reserved paths by complete segment", () => {
    expect(isBookingPath("/settings-coach")).toBe(true);
  });

  it.each([null, "/"])("does not classify %s as a booking page", (pathname) => {
    expect(isBookingPath(pathname)).toBe(false);
  });
});
