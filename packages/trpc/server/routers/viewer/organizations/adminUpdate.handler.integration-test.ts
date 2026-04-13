import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminUpdateHandler } from "./adminUpdate.handler";

const timestamp = Date.now();
const unique = (): string => randomBytes(4).toString("hex");

let org: Team;
let orgWithSettings: Team;

const createdTeamIds: number[] = [];

async function createOrgWithSettings(
  overrides: {
    isOrganizationConfigured?: boolean;
    isOrganizationVerified?: boolean;
    isAdminReviewed?: boolean;
    orgAutoAcceptEmail?: string;
  } = {}
): Promise<Team> {
  const team = await prisma.team.create({
    data: {
      name: `AdminUpd Org ${timestamp}-${unique()}`,
      slug: `admin-upd-org-${timestamp}-${unique()}`,
      isOrganization: true,
      metadata: {},
    },
  });
  createdTeamIds.push(team.id);

  await prisma.organizationSettings.create({
    data: {
      organizationId: team.id,
      isOrganizationConfigured: overrides.isOrganizationConfigured ?? false,
      isOrganizationVerified: overrides.isOrganizationVerified ?? false,
      isAdminReviewed: overrides.isAdminReviewed ?? false,
      orgAutoAcceptEmail: overrides.orgAutoAcceptEmail ?? "company.com",
    },
  });

  return team;
}

describe("organizations/adminUpdate.handler - integration", () => {
  beforeAll(async () => {
    org = await prisma.team.create({
      data: {
        name: `AdminUpd Org ${timestamp}-${unique()}`,
        slug: `admin-upd-org-${timestamp}-${unique()}`,
        isOrganization: true,
        metadata: {},
      },
    });
    createdTeamIds.push(org.id);

    await prisma.organizationSettings.create({
      data: {
        organizationId: org.id,
        isOrganizationConfigured: true,
        isOrganizationVerified: false,
        isAdminReviewed: false,
        orgAutoAcceptEmail: "company.com",
      },
    });

    orgWithSettings = await prisma.team.create({
      data: {
        name: `AdminUpd OrgS ${timestamp}-${unique()}`,
        slug: `admin-upd-orgs-${timestamp}-${unique()}`,
        isOrganization: true,
        metadata: {},
      },
    });
    createdTeamIds.push(orgWithSettings.id);

    await prisma.organizationSettings.create({
      data: {
        organizationId: orgWithSettings.id,
        isOrganizationConfigured: false,
        isOrganizationVerified: false,
        isAdminReviewed: false,
        orgAutoAcceptEmail: "other.com",
      },
    });
  });

  afterAll(async () => {
    try {
      if (createdTeamIds.length > 0) {
        await prisma.organizationSettings.deleteMany({
          where: { organizationId: { in: createdTeamIds } },
        });
        await prisma.tempOrgRedirect.deleteMany({
          where: {
            OR: createdTeamIds.map((id) => ({
              toUrl: { contains: String(id) },
            })),
          },
        });
        await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  describe("organization not found", () => {
    it("should throw 404 when organization does not exist", async () => {
      const error = await adminUpdateHandler({
        ctx: { user: {} } as Parameters<typeof adminUpdateHandler>[0]["ctx"],
        input: { id: 999999999, name: "Ghost Org" },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Organization not found");
    });
  });

  describe("name update", () => {
    it("should update the organization name", async () => {
      const newName = `Updated Name ${unique()}`;

      const result = await adminUpdateHandler({
        ctx: { user: {} } as Parameters<typeof adminUpdateHandler>[0]["ctx"],
        input: { id: org.id, name: newName },
      });

      expect(result.name).toBe(newName);

      const dbOrg = await prisma.team.findUnique({
        where: { id: org.id },
        select: { name: true },
      });
      expect(dbOrg!.name).toBe(newName);
    });
  });

  describe("slug conflicts", () => {
    it("should throw 400 when slug conflicts with another organization", async () => {
      const conflictSlug = `conflict-${timestamp}-${unique()}`;

      const conflictOrg = await prisma.team.create({
        data: {
          name: "Conflict Org",
          slug: conflictSlug,
          isOrganization: true,
        },
      });
      createdTeamIds.push(conflictOrg.id);

      const error = await adminUpdateHandler({
        ctx: { user: {} } as Parameters<typeof adminUpdateHandler>[0]["ctx"],
        input: { id: org.id, slug: conflictSlug },
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("same slug already exists");
    });

    it("should allow updating to the same slug the org already has", async () => {
      const currentSlug = (await prisma.team.findUnique({
        where: { id: org.id },
        select: { slug: true },
      }))!.slug!;

      const result = await adminUpdateHandler({
        ctx: { user: {} } as Parameters<typeof adminUpdateHandler>[0]["ctx"],
        input: { id: org.id, slug: currentSlug },
      });

      expect(result.id).toBe(org.id);
    });
  });

  describe("organization settings update", () => {
    it("should update organizationSettings fields", async () => {
      await adminUpdateHandler({
        ctx: { user: {} } as Parameters<typeof adminUpdateHandler>[0]["ctx"],
        input: {
          id: orgWithSettings.id,
          organizationSettings: {
            isOrganizationConfigured: true,
            isOrganizationVerified: true,
            isAdminReviewed: true,
          },
        },
      });

      const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId: orgWithSettings.id },
        select: {
          isOrganizationConfigured: true,
          isOrganizationVerified: true,
          isAdminReviewed: true,
        },
      });

      expect(settings!.isOrganizationConfigured).toBe(true);
      expect(settings!.isOrganizationVerified).toBe(true);
      expect(settings!.isAdminReviewed).toBe(true);
    });

    it("should preserve existing settings when only partial update is provided", async () => {
      await adminUpdateHandler({
        ctx: { user: {} } as Parameters<typeof adminUpdateHandler>[0]["ctx"],
        input: {
          id: orgWithSettings.id,
          organizationSettings: {
            isAdminReviewed: false,
          },
        },
      });

      const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId: orgWithSettings.id },
        select: {
          isOrganizationConfigured: true,
          isOrganizationVerified: true,
          isAdminReviewed: true,
          orgAutoAcceptEmail: true,
        },
      });

      expect(settings!.isOrganizationConfigured).toBe(true);
      expect(settings!.isOrganizationVerified).toBe(true);
      expect(settings!.isAdminReviewed).toBe(false);
      expect(settings!.orgAutoAcceptEmail).toBe("other.com");
    });
  });

  describe("combined updates", () => {
    it("should update name and settings in a single call", async () => {
      // Use a fresh org so isOrganizationVerified starts as false.
      // The service uses `||` for isOrganizationVerified, so once true it can't be set back to false.
      const freshOrg = await createOrgWithSettings({
        isOrganizationConfigured: false,
        isOrganizationVerified: false,
        isAdminReviewed: false,
      });

      const newName = `Combined Update ${unique()}`;

      const result = await adminUpdateHandler({
        ctx: { user: {} } as Parameters<typeof adminUpdateHandler>[0]["ctx"],
        input: {
          id: freshOrg.id,
          name: newName,
          organizationSettings: {
            isOrganizationVerified: true,
          },
        },
      });

      expect(result.name).toBe(newName);

      const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId: freshOrg.id },
        select: { isOrganizationVerified: true },
      });
      expect(settings!.isOrganizationVerified).toBe(true);
    });
  });
});
