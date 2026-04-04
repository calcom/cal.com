import type { GetServerSidePropsContext } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: () => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  orgDomainConfig: vi.fn(),
  getSlugOrRequestedSlug: vi.fn((slug: string) => ({ slug })),
}));

vi.mock("@calcom/features/ee/organizations/lib/orgSettings", () => ({
  getOrganizationSettings: vi.fn().mockReturnValue(null),
  getVerifiedDomain: vi.fn().mockReturnValue(null),
}));

vi.mock("@calcom/features/ee/teams/lib/queries", () => ({
  getTeamWithMembers: vi.fn(),
}));

vi.mock("@calcom/lib/constants", () => ({
  IS_CALCOM: false,
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

vi.mock("@calcom/lib/markdownToSafeHTML", () => ({
  markdownToSafeHTML: vi.fn((text: string) => text ?? ""),
}));

vi.mock("@calcom/lib/stripMarkdown", () => ({
  stripMarkdown: vi.fn((text: string) => text ?? ""),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    team: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@lib/handleOrgRedirect", () => ({
  handleOrgRedirect: vi.fn().mockResolvedValue(null),
}));

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getTeamWithMembers } from "@calcom/features/ee/teams/lib/queries";
import prisma from "@calcom/prisma";

import { getServerSideProps } from "./getServerSideProps";

// -- Test Data Builders --

function createMockContext(overrides: Partial<GetServerSidePropsContext> = {}): GetServerSidePropsContext {
  return {
    req: {
      headers: { host: "acme.cal.com" },
    },
    res: {},
    query: { slug: "engineering" },
    params: {},
    resolvedUrl: "/team/engineering",
    ...overrides,
  } as unknown as GetServerSidePropsContext;
}

function createMockTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    name: "Engineering",
    slug: "engineering",
    bio: "The engineering team",
    theme: null,
    isPrivate: false,
    isOrganization: false,
    hideBookATeamMember: false,
    logoUrl: null,
    brandColor: null,
    darkBrandColor: null,
    metadata: {},
    parent: null,
    eventTypes: [],
    members: [],
    children: [],
    ...overrides,
  };
}

function createMockOrgParent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "acme",
    name: "Acme Corp",
    isOrganization: true,
    isPrivate: false,
    logoUrl: null,
    metadata: {},
    ...overrides,
  };
}

describe("team/[slug] getServerSideProps", () => {
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

    it("returns team props when a team is found by slug", async () => {
      const team = createMockTeam({
        parent: createMockOrgParent(),
      });
      vi.mocked(getTeamWithMembers).mockResolvedValue(team as any);

      const context = createMockContext();
      const result = await getServerSideProps(context);

      expect(result).toHaveProperty("props.team.id", 10);
      expect(result).toHaveProperty("props.team.slug", "engineering");
      expect(result).toHaveProperty("props.team.name", "Engineering");
      expect(result).toHaveProperty("props.isValidOrgDomain", true);
      expect(result).toHaveProperty("props.currentOrgDomain", "acme");
    });

    it("returns notFound when no team and no unpublished team exist", async () => {
      vi.mocked(getTeamWithMembers).mockResolvedValue(null);
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const context = createMockContext();
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });

    it("returns considerUnpublished when only an unpublished team is found", async () => {
      vi.mocked(getTeamWithMembers).mockResolvedValue(null);
      vi.mocked(prisma.team.findFirst).mockResolvedValue({
        id: 20,
        name: "New Team",
        slug: null,
        metadata: { requestedSlug: "new-team" },
        parent: null,
      } as any);

      const context = createMockContext({ query: { slug: "new-team" } });
      const result = await getServerSideProps(context);

      expect(result).toHaveProperty("props.considerUnpublished", true);
      expect(result).toHaveProperty("props.team.id", 20);
      expect(result).toHaveProperty("props.team.name", "New Team");
    });
  });

  describe("Non-org context", () => {
    beforeEach(() => {
      vi.mocked(orgDomainConfig).mockReturnValue({
        isValidOrgDomain: false,
        currentOrgDomain: null,
      });
    });

    it("returns team props when a standalone team is found (no parent, not org)", async () => {
      const team = createMockTeam();
      vi.mocked(getTeamWithMembers).mockResolvedValue(team as any);

      const context = createMockContext({
        req: { headers: { host: "cal.com" } } as any,
      });
      const result = await getServerSideProps(context);

      expect(result).toHaveProperty("props.team.id", 10);
      expect(result).toHaveProperty("props.team.slug", "engineering");
      expect(result).toHaveProperty("props.team.name", "Engineering");
      expect(result).toHaveProperty("props.isValidOrgDomain", false);
    });

    it("returns notFound when team has a parent (sub-team not visible outside org)", async () => {
      const team = createMockTeam({
        parent: createMockOrgParent(),
      });
      vi.mocked(getTeamWithMembers).mockResolvedValue(team as any);

      const context = createMockContext({
        req: { headers: { host: "cal.com" } } as any,
      });
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });

    it("returns notFound when team is an organization", async () => {
      const team = createMockTeam({ isOrganization: true });
      vi.mocked(getTeamWithMembers).mockResolvedValue(team as any);

      const context = createMockContext({
        req: { headers: { host: "cal.com" } } as any,
      });
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });

    it("returns notFound when no team is found", async () => {
      vi.mocked(getTeamWithMembers).mockResolvedValue(null);
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const context = createMockContext({
        req: { headers: { host: "cal.com" } } as any,
      });
      const result = await getServerSideProps(context);

      expect(result).toEqual({ notFound: true });
    });
  });
});
