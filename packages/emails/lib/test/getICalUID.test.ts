import { describe, expect } from "vitest";

import { ICAL_UID_DOMAIN } from "@calcom/lib/constants";
import { buildCalendarEvent } from "@calcom/lib/test/builder";
import { test } from "@calcom/web/test/fixtures/fixtures";

import getICalUID from "../getICalUID";

describe("getICalUid", () => {
  test("returns iCalUID when passing a uid", () => {
    const iCalUID = getICalUID({ uid: "123" });
    expect(iCalUID).toEqual(`123@${ICAL_UID_DOMAIN}`);
  });
  test("returns iCalUID when passing an event", () => {
    const event = buildCalendarEvent({ iCalUID: `123@${ICAL_UID_DOMAIN}` });
    const iCalUID = getICalUID({ event });
    expect(iCalUID).toEqual(`123@${ICAL_UID_DOMAIN}`);
  });
  test("returns new iCalUID when passing in an event with no iCalUID but has an uid", () => {
    const event = buildCalendarEvent({ iCalUID: "" });
    const iCalUID = getICalUID({ event, defaultToEventUid: true });
    expect(iCalUID).toEqual(`${event.uid}@${ICAL_UID_DOMAIN}`);
  });
  test("returns new iCalUID when passing in an event with no iCalUID and uses uid passed", () => {
    const event = buildCalendarEvent({ iCalUID: "" });
    const iCalUID = getICalUID({ event, uid: "123" });
    expect(iCalUID).toEqual(`123@${ICAL_UID_DOMAIN}`);
  });
});
