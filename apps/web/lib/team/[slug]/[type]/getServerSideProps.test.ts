import type { GetServerSidePropsContext } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/features/bookings/lib/get-booking", () => ({
  getBookingForReschedule: vi.fn(),
  getBookingForSeatedEvent: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/isActionDisabledByScope", () => ({
  isActionDisabledByScope: vi.fn().mockReturnValue(false),
}));

vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: () => ({
    checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  orgDomainConfig: vi.fn(),
  getSlugOrRequestedSlug: vi.fn((slug: string) => ({ slug })),
}));

vi.mock("@calcom/features/ee/organizations/lib/orgSettings", () => ({
  getOrganizationSEOSettings: vi.fn().mockReturnValue(null),
}));

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getDunningGuard: () => ({
    canPerformAction: vi.fn().mockResolvedValue({ allowed: true }),
  }),
}));

vi.mock("@calcom/features/profile/lib/getBranding", () => ({
  getBrandingForEventType: vi.fn().mockReturnValue({
    theme: null,
    brandColor: "#000",
    darkBrandColor: "#fff",
  }),
}));

vi.mock("@calcom/features/profile/lib/hideBranding", () => ({
  shouldHideBrandingForTeamEvent: vi.fn().mockReturnValue(false),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: {
      findFirst: vi.fn(),
    },
    eventType: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ users: [] }),
    },
  },
}));

vi.mock("@lib/handleOrgRedirect", () => ({
  handleOrgRedirect: vi.fn().mockResolvedValue(null),
}));

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { prisma } from "@calcom/prisma";

import { getServerSideProps } from "./getServerSideProps";

// -- Test Data Builders --

function createMockContext(overrides: Partial<GetServerSidePropsContext> = {}): GetServerSidePropsContext {
  return {
    req: {
      headers: { host: "acme.cal.com" },
    },
    res: {},
    query: {},
    params: { slug: "engineering", type: "standup" },
    resolvedUrl: "/team/engineering/standup",
    ...overrides,
  } as unknown as GetServerSidePropsContext;
}

function createMockEventType(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Standup",
    isInstantEvent: false,
    schedulingType: "ROUND_ROBIN",
    metadata: {},
    length: 30,
    hidden: false,
    disableCancelling: false,
    disableRescheduling: false,
    disableReschedulingScope: null,
    allowReschedulingCancelledBookings: false,
    redirectUrlOnNoRoutingFormResponse: null,
    interfaceLanguage: null,
    hosts: [],
    ...overrides,
  };
}

function createMockTeamWithEvents(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    isPrivate: false,
    hideBranding: false,
    parent: null,
    logoUrl: null,
    name: "Engineering",
    slug: "engineering",
    brandColor: null,
    darkBrandColor: null,
    theme: null,
    isOrganization: false,
    organizationSettings: null,
    eventTypes: [createMockEventType()],
    ...overrides,
  };
}

function createMockOrgParent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "acme",
    name: "Acme Corp",
    bannerUrl: null,
    logoUrl: null,
    hideBranding: false,
    brandColor: null,
    darkBrandColor: null,
    theme: null,
    organizationSettings: null,
    ...overrides,
  };
}

describe("team/[slug]/[type] getServerSideProps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Org context", () => {
    beforeEach(() => {
      vi.mocked(orgDomainConfig).mockReturnValue({
        isValidOrgDomain: true,
        currentOrgDomain: "acme",
      });
    });

    it("returns event data when team and event type are found", async () => {
      const team = createMockTeamWithEvents({
        parent: createMockOrgParent(),
      });
      vi.mocked(prisma.team.findFirst).mockResolvedValue(team as any);

      const context = createMockContext();
      const result = await getServerSideProps(context);

      expect(result).toHaveProperty("props.teamId", 10);
      expect(result).toHaveProperty("props.slug", "standup");
      expect(result).toHaveProperty("props.eventData.title", "Standup");
      expect(result).toHaveProperty("props.eventData.length", 30);
      expect(result).toHaveProperty("props.eventData.eventTypeId", 1);
    });

    it("returns notFound when no team is found", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const context = createMockContext();
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });

    it("returns notFound when team is found but has no matching event type", async () => {
      const team = createMockTeamWithEvents({ eventTypes: [] });
      vi.mocked(prisma.team.findFirst).mockResolvedValue(team as any);

      const context = createMockContext();
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });

    it("returns notFound when event type scheduling is MANAGED", async () => {
      const team = createMockTeamWithEvents({
        eventTypes: [createMockEventType({ schedulingType: "MANAGED" })],
      });
      vi.mocked(prisma.team.findFirst).mockResolvedValue(team as any);

      const context = createMockContext();
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });
  });

  describe("Non-org context", () => {
    beforeEach(() => {
      vi.mocked(orgDomainConfig).mockReturnValue({
        isValidOrgDomain: false,
        currentOrgDomain: null,
      });
    });

    it("returns event data for standalone team with event type", async () => {
      const team = createMockTeamWithEvents();
      vi.mocked(prisma.team.findFirst).mockResolvedValue(team as any);

      const context = createMockContext({
        req: { headers: { host: "cal.com" } } as any,
      });
      const result = await getServerSideProps(context);

      expect(result).toHaveProperty("props.teamId", 10);
      expect(result).toHaveProperty("props.slug", "standup");
      expect(result).toHaveProperty("props.eventData.title", "Standup");
      expect(result).toHaveProperty("props.eventData.eventTypeId", 1);
    });

    it("returns notFound when no team is found", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const context = createMockContext({
        req: { headers: { host: "cal.com" } } as any,
      });
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });
  });
});
