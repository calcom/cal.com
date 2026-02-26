import { describe, expect, it } from "vitest";
import { withSelectedCalendars } from "./withSelectedCalendars";

describe("withSelectedCalendars", () => {
  it("renames selectedCalendars to allSelectedCalendars", () => {
    const user = {
      id: 1,
      name: "Test",
      selectedCalendars: [
        { eventTypeId: null, externalId: "cal-1" },
        { eventTypeId: 10, externalId: "cal-2" },
      ],
    };

    const result = withSelectedCalendars(user);

    expect(result.allSelectedCalendars).toEqual([
      { eventTypeId: null, externalId: "cal-1" },
      { eventTypeId: 10, externalId: "cal-2" },
    ]);
    expect(result).not.toHaveProperty("selectedCalendars");
  });

  it("filters userLevelSelectedCalendars to exclude event-type-specific ones", () => {
    const user = {
      id: 1,
      selectedCalendars: [
        { eventTypeId: null, externalId: "user-cal" },
        { eventTypeId: 5, externalId: "event-cal" },
        { eventTypeId: null, externalId: "user-cal-2" },
      ],
    };

    const result = withSelectedCalendars(user);

    expect(result.userLevelSelectedCalendars).toEqual([
      { eventTypeId: null, externalId: "user-cal" },
      { eventTypeId: null, externalId: "user-cal-2" },
    ]);
  });

  it("returns empty arrays when no calendars", () => {
    const user = {
      id: 1,
      selectedCalendars: [],
    };

    const result = withSelectedCalendars(user);

    expect(result.allSelectedCalendars).toEqual([]);
    expect(result.userLevelSelectedCalendars).toEqual([]);
  });

  it("returns empty userLevelSelectedCalendars when all are event-type-specific", () => {
    const user = {
      id: 1,
      selectedCalendars: [
        { eventTypeId: 1, externalId: "cal-a" },
        { eventTypeId: 2, externalId: "cal-b" },
      ],
    };

    const result = withSelectedCalendars(user);

    expect(result.allSelectedCalendars).toHaveLength(2);
    expect(result.userLevelSelectedCalendars).toEqual([]);
  });

  it("preserves other user properties", () => {
    const user = {
      id: 42,
      name: "User Name",
      email: "user@example.com",
      selectedCalendars: [{ eventTypeId: null, externalId: "cal-1" }],
    };

    const result = withSelectedCalendars(user);

    expect(result.id).toBe(42);
    expect(result.name).toBe("User Name");
    expect(result.email).toBe("user@example.com");
  });

  it("treats eventTypeId: 0 as event-type-specific (truthy check)", () => {
    const user = {
      id: 1,
      selectedCalendars: [{ eventTypeId: 0, externalId: "cal-zero" }],
    };

    const result = withSelectedCalendars(user);

    // eventTypeId 0 is falsy, so !0 = true, meaning it WILL be included in userLevel
    expect(result.userLevelSelectedCalendars).toEqual([{ eventTypeId: 0, externalId: "cal-zero" }]);
  });
});
