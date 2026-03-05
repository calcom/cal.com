import { describe, expect, it } from "vitest";
import { getProfileFromEvent } from "./getPublicEvent";

function createEventInput(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Test Event",
    description: null,
    interfaceLanguage: null,
    eventName: null,
    slug: "test-event",
    isInstantEvent: false,
    instantMeetingParameters: [],
    aiPhoneCallConfig: null,
    schedulingType: null,
    length: 30,
    locations: [],
    enablePerHostLocations: false,
    customInputs: [],
    disableGuests: false,
    metadata: null,
    lockTimeZoneToggleOnBookingPage: false,
    lockedTimeZone: null,
    requiresConfirmation: false,
    autoTranslateDescriptionEnabled: false,
    fieldTranslations: [],
    requiresBookerEmailVerification: false,
    recurringEvent: null,
    price: 0,
    currency: "usd",
    seatsPerTimeSlot: null,
    disableCancelling: false,
    disableRescheduling: false,
    minimumRescheduleNotice: null,
    allowReschedulingCancelledBookings: false,
    seatsShowAvailabilityCount: null,
    bookingFields: [],
    teamId: null,
    team: null,
    successRedirectUrl: null,
    forwardParamsSuccessRedirect: true,
    redirectUrlOnNoRoutingFormResponse: null,
    workflows: [],
    owner: null,
    schedule: null,
    instantMeetingSchedule: null,
    periodType: "UNLIMITED",
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodCountCalendarDays: null,
    hidden: false,
    assignAllTeamMembers: false,
    rescheduleWithSameRoundRobinHost: false,
    restrictionScheduleId: null,
    useBookerTimezone: false,
    parent: null,
    subsetOfHosts: [] as Array<{
      user: {
        id: number;
        avatarUrl: string | null;
        username: string | null;
        name: string | null;
        weekStart: string;
        brandColor: string | null;
        darkBrandColor: string | null;
        theme: string | null;
        metadata: unknown;
        organization: {
          id: number;
          name: string;
          slug: string | null;
          bannerUrl: string | null;
          organizationSettings: { disableAutofillOnBookingPage: boolean } | null;
        } | null;
        defaultScheduleId: number | null;
      };
    }>,
    ...overrides,
  };
}

function createUserHost(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 1,
      avatarUrl: null,
      username: "alice",
      name: "Alice",
      weekStart: "Monday",
      brandColor: "#111",
      darkBrandColor: "#222",
      theme: "light",
      metadata: null,
      organization: null,
      defaultScheduleId: null,
      ...overrides,
    },
  };
}

function createTeam(overrides: Record<string, unknown> = {}) {
  return {
    parentId: null,
    metadata: null,
    brandColor: "#000",
    darkBrandColor: "#FFF",
    slug: "team-a",
    name: "Team A",
    logoUrl: null,
    theme: "dark",
    hideTeamProfileLink: false,
    parent: null,
    isPrivate: false,
    organizationSettings: null,
    ...overrides,
  };
}

describe("getProfileFromEvent", () => {
  it("uses team profile for team event", () => {
    const event = createEventInput({
      team: createTeam({ name: "Team A", brandColor: "#000" }),
    });

    const profile = getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0]);

    expect(profile.name).toBe("Team A");
    expect(profile.brandColor).toBe("#000");
  });

  it("uses host profile for non-team event with hosts", () => {
    const host = createUserHost({ username: "alice", weekStart: "Monday" });
    const event = createEventInput({
      team: null,
      subsetOfHosts: [host],
    });

    const profile = getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0]);

    expect(profile.username).toBe("alice");
    expect(profile.weekStart).toBe("Monday");
  });

  it("uses owner profile when no hosts and no team", () => {
    const event = createEventInput({
      team: null,
      subsetOfHosts: [],
      owner: {
        id: 2,
        avatarUrl: "https://example.com/bob.png",
        username: "bob",
        name: "Bob",
        weekStart: "Sunday",
        brandColor: "#333",
        darkBrandColor: "#444",
        theme: "dark",
        metadata: null,
        organization: null,
        defaultScheduleId: null,
      },
    });

    const profile = getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0]);

    expect(profile.username).toBe("bob");
    expect(profile.weekStart).toBe("Sunday");
    expect(profile.brandColor).toBe("#333");
  });

  it('throws "Event has no owner" when no team, no hosts, no owner', () => {
    const event = createEventInput({
      team: null,
      subsetOfHosts: [],
      owner: null,
    });

    expect(() => getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0])).toThrow(
      "Event has no owner"
    );
  });

  it("team styles take precedence over parent team styles", () => {
    const event = createEventInput({
      team: createTeam({ brandColor: "#AAA" }),
      parent: {
        team: {
          theme: "parent-theme",
          brandColor: "#FFF",
          darkBrandColor: "#000",
        },
      },
    });

    const profile = getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0]);

    expect(profile.brandColor).toBe("#AAA");
  });

  it("returns parsed bookerLayouts from event metadata", () => {
    const event = createEventInput({
      metadata: {
        bookerLayouts: {
          enabledLayouts: ["month_view", "week_view"],
          defaultLayout: "month_view",
        },
      },
      owner: {
        id: 1,
        avatarUrl: null,
        username: "alice",
        name: "Alice",
        weekStart: "Monday",
        brandColor: null,
        darkBrandColor: null,
        theme: null,
        metadata: null,
        organization: null,
        defaultScheduleId: null,
      },
    });

    const profile = getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0]);

    expect(profile.bookerLayouts).toBeDefined();
    expect(profile.bookerLayouts.enabledLayouts).toContain("month_view");
  });

  it("returns user default bookerLayouts when no event-level layouts", () => {
    const event = createEventInput({
      metadata: null,
      owner: {
        id: 1,
        avatarUrl: null,
        username: "alice",
        name: "Alice",
        weekStart: "Monday",
        brandColor: null,
        darkBrandColor: null,
        theme: null,
        metadata: {
          defaultBookerLayouts: {
            enabledLayouts: ["column_view"],
            defaultLayout: "column_view",
          },
        },
        organization: null,
        defaultScheduleId: null,
      },
    });

    const profile = getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0]);

    expect(profile.bookerLayouts).toBeDefined();
    expect(profile.bookerLayouts.enabledLayouts).toContain("column_view");
  });

  it("returns team avatar image for team event", () => {
    const event = createEventInput({
      team: createTeam({ logoUrl: "https://example.com/logo.png", name: "Team A" }),
    });

    const profile = getProfileFromEvent(event as Parameters<typeof getProfileFromEvent>[0]);

    expect(profile.image).toBeDefined();
    expect(typeof profile.image).toBe("string");
  });
});
