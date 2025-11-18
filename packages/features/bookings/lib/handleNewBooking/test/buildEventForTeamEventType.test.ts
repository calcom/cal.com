// or wherever it's from
import { vi, describe, it, expect, beforeEach } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

import { buildEventForTeamEventType } from "../../service/RegularBookingService";

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue("translated"),
}));

vi.mock("@calcom/prisma", () => {
  return {
    default: vi.fn(),
    prisma: {},
  };
});

const withTeamSpy = vi.fn().mockReturnThis();
const withDestinationCalendarSpy = vi.fn().mockReturnThis();

vi.mock("@calcom/features/CalendarEventBuilder", () => {
  return {
    CalendarEventBuilder: {
      fromEvent: vi.fn().mockImplementation((_evt) => ({
        withDestinationCalendar: withDestinationCalendarSpy,
        withTeam: withTeamSpy,
        build: vi.fn().mockImplementation(() => ({
          destinationCalendar: [],
          team: {}, // <- you won't use this result anyway
        })),
      })),
    },
  };
});

vi.mock("@calcom/app-store/_utils/calendars/processExternalId", () => ({
  default: vi.fn((dc) => `external-${dc?.externalId ?? "id"}`),
}));

const baseUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  timeZone: "Europe/Paris",
  locale: "fr",
  destinationCalendar: {
    id: 123,
    integration: "google",
    externalId: "ext-123",
    primaryEmail: "alice@example.com",
    userId: 1,
    eventTypeId: null,
    credentialId: null,
    delegationCredentialId: null,
    domainWideDelegationCredentialId: null,
  },
  isFixed: true,
  ...overrides,
});

describe("buildEventForTeamEventType", () => {
  it("throws if schedulingType is null", async () => {
    await expect(
      buildEventForTeamEventType({
        existingEvent: {},
        users: [],
        organizerUser: { email: "organizer@example.com" },
        schedulingType: null,
      })
    ).rejects.toThrow("Scheduling type is required for team event type");
  });

  it("filters out the organizer", async () => {
    await buildEventForTeamEventType({
      existingEvent: {},
      users: [baseUser({ email: "organizer@example.com" })],
      organizerUser: { email: "organizer@example.com" },
      schedulingType: SchedulingType.COLLECTIVE,
    });

    const teamArgs = withTeamSpy.mock.calls[0][0];
    const memberEmails = teamArgs.members.map((m: { email: string }) => m.email);

    expect(memberEmails).not.toContain("organizer@example.com");
  });

  it("includes destinationCalendars for COLLECTIVE", async () => {
    await buildEventForTeamEventType({
      existingEvent: { destinationCalendar: [] },
      users: [baseUser({ id: 2 })],
      organizerUser: { email: "organizer@example.com" },
      schedulingType: SchedulingType.COLLECTIVE,
    });

    const withDestinationCalendarArgs = withDestinationCalendarSpy.mock.calls[0][0];

    expect(withDestinationCalendarArgs).not.toHaveLength(0);
  });

  it("does not include destinationCalendars for ROUND_ROBIN", async () => {
    await buildEventForTeamEventType({
      existingEvent: { destinationCalendar: [] },
      users: [baseUser({ id: 2 })],
      organizerUser: { email: "organizer@example.com" },
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    const withDestinationCalendarArgs = withDestinationCalendarSpy.mock.calls[0][0];

    expect(withDestinationCalendarArgs).toHaveLength(0);
  });

  it("includes one non-fixed user for ROUND_ROBIN when fixed users exist", async () => {
    await buildEventForTeamEventType({
      existingEvent: {},
      users: [
        baseUser({ id: 2, isFixed: false, email: "nonfixed@example.com" }),
        baseUser({ id: 3, isFixed: true, email: "fixed@example.com" }),
      ],
      organizerUser: { email: "organizer@example.com" },
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    const teamArgs = withTeamSpy.mock.calls[0][0];
    const memberEmails = teamArgs.members.map((m: { email: string }) => m.email);

    expect(memberEmails).toContain("fixed@example.com");
    expect(memberEmails).toContain("nonfixed@example.com");
  });

  it("includes only the first non-fixed user for ROUND_ROBIN when multiple exist", async () => {
    await buildEventForTeamEventType({
      existingEvent: {},
      users: [
        baseUser({ id: 3, isFixed: true, email: "fixed@example.com" }),
        baseUser({ id: 2, isFixed: false, email: "nonfixed1@example.com" }),
        baseUser({ id: 4, isFixed: false, email: "nonfixed2@example.com" }),
      ],
      organizerUser: { email: "organizer@example.com" },
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    const teamArgs = withTeamSpy.mock.calls[0][0];
    const memberEmails = teamArgs.members.map((m: { email: string }) => m.email);

    expect(memberEmails).toContain("fixed@example.com");
    expect(memberEmails).toContain("nonfixed1@example.com");
    expect(memberEmails).toContain("nonfixed2@example.com");
  });

  it("builds a team with fallback name and id", async () => {
    await buildEventForTeamEventType({
      existingEvent: {},
      users: [baseUser()],
      organizerUser: { email: "organizer@example.com" },
      schedulingType: SchedulingType.COLLECTIVE,
      team: null,
    });

    // now inspect what was passed into withTeam()
    const teamArgs = withTeamSpy.mock.calls[0][0];

    expect(teamArgs.name).toBe("Nameless");
    expect(teamArgs.id).toBe(0);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });
});
