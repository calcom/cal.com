import { vi, describe, it, expect, beforeEach } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

import { computeTeamData } from "../../service/RegularBookingService";

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue("translated"),
}));

vi.mock("@calcom/prisma", () => {
  return {
    default: vi.fn(),
    prisma: {},
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

describe("computeTeamData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty arrays if isTeamEventType is false", async () => {
    const result = await computeTeamData({
      isTeamEventType: false,
      schedulingType: SchedulingType.COLLECTIVE,
      users: [baseUser()],
      organizerEmail: "organizer@example.com",
    });

    expect(result.teamMembers).toHaveLength(0);
    expect(result.teamDestinationCalendars).toHaveLength(0);
  });

  it("returns empty arrays if schedulingType is null", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: null,
      users: [baseUser()],
      organizerEmail: "organizer@example.com",
    });

    expect(result.teamMembers).toHaveLength(0);
    expect(result.teamDestinationCalendars).toHaveLength(0);
  });

  it("filters out the organizer from team members", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: SchedulingType.COLLECTIVE,
      users: [baseUser({ email: "organizer@example.com" }), baseUser({ id: 2, email: "member@example.com" })],
      organizerEmail: "organizer@example.com",
    });

    const memberEmails = result.teamMembers.map((m) => m.email);
    expect(memberEmails).not.toContain("organizer@example.com");
    expect(memberEmails).toContain("member@example.com");
  });

  it("includes destinationCalendars for COLLECTIVE scheduling type", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: SchedulingType.COLLECTIVE,
      users: [baseUser({ id: 2, email: "member@example.com" })],
      organizerEmail: "organizer@example.com",
    });

    expect(result.teamDestinationCalendars).toHaveLength(1);
    expect(result.teamDestinationCalendars[0].externalId).toBe("external-ext-123");
  });

  it("does not include destinationCalendars for ROUND_ROBIN scheduling type", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: SchedulingType.ROUND_ROBIN,
      users: [baseUser({ id: 2, email: "member@example.com" })],
      organizerEmail: "organizer@example.com",
    });

    expect(result.teamDestinationCalendars).toHaveLength(0);
  });

  it("includes both fixed and non-fixed users for ROUND_ROBIN", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: SchedulingType.ROUND_ROBIN,
      users: [
        baseUser({ id: 2, isFixed: false, email: "nonfixed@example.com" }),
        baseUser({ id: 3, isFixed: true, email: "fixed@example.com" }),
      ],
      organizerEmail: "organizer@example.com",
    });

    const memberEmails = result.teamMembers.map((m) => m.email);
    expect(memberEmails).toContain("fixed@example.com");
    expect(memberEmails).toContain("nonfixed@example.com");
  });

  it("includes all non-fixed users for ROUND_ROBIN when multiple exist", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: SchedulingType.ROUND_ROBIN,
      users: [
        baseUser({ id: 3, isFixed: true, email: "fixed@example.com" }),
        baseUser({ id: 2, isFixed: false, email: "nonfixed1@example.com" }),
        baseUser({ id: 4, isFixed: false, email: "nonfixed2@example.com" }),
      ],
      organizerEmail: "organizer@example.com",
    });

    const memberEmails = result.teamMembers.map((m) => m.email);
    expect(memberEmails).toContain("fixed@example.com");
    expect(memberEmails).toContain("nonfixed1@example.com");
    expect(memberEmails).toContain("nonfixed2@example.com");
  });

  it("returns team members with correct structure", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: SchedulingType.COLLECTIVE,
      users: [baseUser({ id: 2, email: "member@example.com", name: "Member Name" })],
      organizerEmail: "organizer@example.com",
    });

    expect(result.teamMembers).toHaveLength(1);
    expect(result.teamMembers[0]).toEqual({
      id: 2,
      email: "member@example.com",
      name: "Member Name",
      firstName: "",
      lastName: "",
      timeZone: "Europe/Paris",
      language: {
        translate: "translated",
        locale: "fr",
      },
    });
  });

  it("handles users without destinationCalendar for COLLECTIVE", async () => {
    const result = await computeTeamData({
      isTeamEventType: true,
      schedulingType: SchedulingType.COLLECTIVE,
      users: [baseUser({ id: 2, email: "member@example.com", destinationCalendar: null })],
      organizerEmail: "organizer@example.com",
    });

    expect(result.teamMembers).toHaveLength(1);
    expect(result.teamDestinationCalendars).toHaveLength(0);
  });
});
