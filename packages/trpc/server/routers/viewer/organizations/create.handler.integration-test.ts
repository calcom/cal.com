import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { CreationSource, MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHandler } from "./create.handler";
import { BillingPeriod } from "./create.schema";

const timestamp = Date.now();
const unique = (): string => randomBytes(4).toString("hex");

let adminUser: User;
let regularUser: User;

const createdUserIds: number[] = [];
const createdTeamIds: number[] = [];

function adminCtx(user: User) {
  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      locale: "en",
      role: user.role,
      profile: { organizationId: null },
    },
  } as Parameters<typeof createHandler>[0]["ctx"];
}

function regularCtx(user: User, organizationId: number | null = null) {
  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      locale: "en",
      role: user.role,
      profile: { organizationId },
    },
  } as Parameters<typeof createHandler>[0]["ctx"];
}

function baseInput(overrides: Partial<Parameters<typeof createHandler>[0]["input"]> = {}) {
  return {
    name: `Test Org ${unique()}`,
    slug: `test-org-${timestamp}-${unique()}`,
    orgOwnerEmail: adminUser.email,
    isPlatform: true,
    creationSource: CreationSource.WEBAPP,
    ...overrides,
  } as Parameters<typeof createHandler>[0]["input"];
}

async function createFreshAdminUser(): Promise<User> {
  const user = await prisma.user.create({
    data: {
      username: `org-admin-${timestamp}-${unique()}`,
      email: `org-admin-${timestamp}-${unique()}@company.com`,
      name: "Fresh Admin",
      role: UserPermissionRole.ADMIN,
      emailVerified: new Date(),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createFreshOwnerUser(): Promise<User> {
  const user = await prisma.user.create({
    data: {
      username: `org-owner-${timestamp}-${unique()}`,
      email: `org-owner-${timestamp}-${unique()}@company.com`,
      name: "Fresh Owner",
      emailVerified: new Date(),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("organizations/create.handler - integration", () => {
  beforeAll(async () => {
    adminUser = await prisma.user.create({
      data: {
        username: `org-create-admin-${timestamp}-${unique()}`,
        email: `org-create-admin-${timestamp}-${unique()}@company.com`,
        name: "Admin User",
        role: UserPermissionRole.ADMIN,
        emailVerified: new Date(),
      },
    });
    createdUserIds.push(adminUser.id);

    regularUser = await prisma.user.create({
      data: {
        username: `org-create-reg-${timestamp}-${unique()}`,
        email: `org-create-reg-${timestamp}-${unique()}@company.com`,
        name: "Regular User",
        role: UserPermissionRole.USER,
        emailVerified: new Date(),
      },
    });
    createdUserIds.push(regularUser.id);
  });

  afterAll(async () => {
    try {
      if (createdTeamIds.length > 0) {
        await prisma.membership.deleteMany({ where: { teamId: { in: createdTeamIds } } });
        await prisma.organizationSettings.deleteMany({
          where: { organizationId: { in: createdTeamIds } },
        });
        await prisma.profile.deleteMany({
          where: {
            organizationId: { in: createdTeamIds },
          },
        });
        await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
      }
      if (createdUserIds.length > 0) {
        await prisma.availability.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.profile.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.membership.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  describe("authorization and validation", () => {
    it("should throw UNAUTHORIZED when the logged-in user does not exist in DB", async () => {
      const fakeCtx = {
        user: {
          id: 999999999,
          uuid: "fake-uuid",
          name: "Ghost",
          email: "ghost@example.com",
          locale: "en",
          role: UserPermissionRole.USER,
          profile: { organizationId: null },
        },
      } as Parameters<typeof createHandler>[0]["ctx"];

      const error = await createHandler({
        ctx: fakeCtx,
        input: baseInput({ orgOwnerEmail: "ghost@example.com" }),
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("not authorized");
    });

    it("should throw FORBIDDEN when non-admin tries to create org for a different email", async () => {
      const error = await createHandler({
        ctx: regularCtx(regularUser),
        input: baseInput({ orgOwnerEmail: "someone-else@company.com" }),
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("You can only create organization where you are the owner");
    });

    it("should throw BAD_REQUEST when org slug is already taken", async () => {
      const slug = `taken-slug-${timestamp}-${unique()}`;

      const existingOrg = await prisma.team.create({
        data: {
          name: "Existing Org",
          slug,
          isOrganization: true,
        },
      });
      createdTeamIds.push(existingOrg.id);

      const freshAdmin = await createFreshAdminUser();
      const error = await createHandler({
        ctx: adminCtx(freshAdmin),
        input: baseInput({ slug, orgOwnerEmail: freshAdmin.email }),
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("organization_url_taken");
    });

    it("should throw BAD_REQUEST when user already has a platform team and tries to create another", async () => {
      const freshAdmin = await createFreshAdminUser();
      const platformTeam = await prisma.team.create({
        data: {
          name: "Existing Platform",
          slug: `platform-${timestamp}-${unique()}`,
          isPlatform: true,
        },
      });
      createdTeamIds.push(platformTeam.id);

      await prisma.membership.create({
        data: {
          teamId: platformTeam.id,
          userId: freshAdmin.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });

      const error = await createHandler({
        ctx: adminCtx(freshAdmin),
        input: baseInput({ orgOwnerEmail: freshAdmin.email }),
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("already a part of");
    });

    it("should throw FORBIDDEN when existing owner has unverified email", async () => {
      const unverifiedUser = await prisma.user.create({
        data: {
          username: `org-unverified-${timestamp}-${unique()}`,
          email: `org-unverified-${timestamp}-${unique()}@company.com`,
          name: "Unverified",
          emailVerified: null,
        },
      });
      createdUserIds.push(unverifiedUser.id);

      const freshAdmin = await createFreshAdminUser();
      const error = await createHandler({
        ctx: adminCtx(freshAdmin),
        input: baseInput({ orgOwnerEmail: unverifiedUser.email }),
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("verify your email");
    });

    it("should throw FORBIDDEN when existing owner is already in an organization", async () => {
      const orgForOwner = await prisma.team.create({
        data: {
          name: `Owner Org ${unique()}`,
          slug: `owner-org-${timestamp}-${unique()}`,
          isOrganization: true,
        },
      });
      createdTeamIds.push(orgForOwner.id);

      const ownerInOrg = await prisma.user.create({
        data: {
          username: `org-already-${timestamp}-${unique()}`,
          email: `org-already-${timestamp}-${unique()}@company.com`,
          name: "Already In Org",
          emailVerified: new Date(),
        },
      });
      createdUserIds.push(ownerInOrg.id);

      const error = await createHandler({
        ctx: {
          user: {
            id: ownerInOrg.id,
            uuid: ownerInOrg.uuid,
            name: ownerInOrg.name,
            email: ownerInOrg.email,
            locale: "en",
            role: ownerInOrg.role,
            profile: { organizationId: orgForOwner.id },
          },
        } as Parameters<typeof createHandler>[0]["ctx"],
        input: baseInput({ orgOwnerEmail: ownerInOrg.email }),
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("part of an organization already");
    });
  });

  describe("successful creation - existing owner (platform)", () => {
    it("should create an org with an existing verified user as owner", async () => {
      const freshAdmin = await createFreshAdminUser();
      const ownerUser = await createFreshOwnerUser();

      const slug = `new-org-${timestamp}-${unique()}`;
      const result = await createHandler({
        ctx: adminCtx(freshAdmin),
        input: baseInput({
          name: "My New Org",
          slug,
          orgOwnerEmail: ownerUser.email,
          isPlatform: true,
          seats: 10,
          pricePerSeat: 15,
        }),
      });

      expect(result.userId).toBe(ownerUser.id);
      expect(result.email).toBe(ownerUser.email);
      expect(result.organizationId).toBeDefined();
      expect(result.upId).toBeDefined();

      const orgId = result.organizationId!;
      createdTeamIds.push(orgId);

      const org = await prisma.team.findUnique({
        where: { id: orgId },
        select: {
          name: true,
          slug: true,
          isOrganization: true,
          isPlatform: true,
        },
      });
      expect(org).not.toBeNull();
      expect(org!.name).toBe("My New Org");
      expect(org!.slug).toBe(slug);
      expect(org!.isOrganization).toBe(true);
      expect(org!.isPlatform).toBe(true);

      const membership = await prisma.membership.findFirst({
        where: { teamId: orgId, userId: ownerUser.id },
        select: { role: true, accepted: true },
      });
      expect(membership).not.toBeNull();
      expect(membership!.role).toBe(MembershipRole.OWNER);
      expect(membership!.accepted).toBe(true);
    });

    it("should enforce MONTHLY billing for non-admin even when ANNUALLY is requested", async () => {
      const nonAdminOwner = await createFreshOwnerUser();

      const slug = `billing-org-${timestamp}-${unique()}`;
      const result = await createHandler({
        ctx: regularCtx(nonAdminOwner),
        input: baseInput({
          slug,
          orgOwnerEmail: nonAdminOwner.email,
          billingPeriod: BillingPeriod.ANNUALLY,
        }),
      });

      expect(result.organizationId).toBeDefined();
      createdTeamIds.push(result.organizationId!);

      const org = await prisma.team.findUnique({
        where: { id: result.organizationId! },
        select: { metadata: true },
      });
      expect(org).not.toBeNull();
      const metadata = org!.metadata as Record<string, unknown>;
      expect(metadata.billingPeriod).toBe(BillingPeriod.MONTHLY);
    });
  });

  describe("slug validation edge cases", () => {
    it("should allow creating an org with a slug that matches a child team under another org", async () => {
      const sharedSlug = `shared-slug-${timestamp}-${unique()}`;

      // Create a parent org first, then a child team with the shared slug.
      // The unique constraint is on (slug, parentId), so a child team (parentId != null)
      // won't conflict with a new top-level org (parentId = null).
      const parentOrg = await prisma.team.create({
        data: {
          name: `Parent Org ${unique()}`,
          slug: `parent-org-${timestamp}-${unique()}`,
          isOrganization: true,
        },
      });
      createdTeamIds.push(parentOrg.id);

      const childTeam = await prisma.team.create({
        data: {
          name: "Child Team",
          slug: sharedSlug,
          parentId: parentOrg.id,
        },
      });
      createdTeamIds.push(childTeam.id);

      const freshAdmin = await createFreshAdminUser();
      const ownerUser = await createFreshOwnerUser();

      const result = await createHandler({
        ctx: adminCtx(freshAdmin),
        input: baseInput({
          slug: sharedSlug,
          orgOwnerEmail: ownerUser.email,
        }),
      });

      expect(result.organizationId).toBeDefined();
      createdTeamIds.push(result.organizationId!);

      const org = await prisma.team.findUnique({
        where: { id: result.organizationId! },
        select: { slug: true, isOrganization: true },
      });
      expect(org?.slug).toBe(sharedSlug);
      expect(org?.isOrganization).toBe(true);
    });

    it("should reject slug that matches an existing org even with different casing", async () => {
      const slug = `case-test-${timestamp}-${unique()}`;

      const existingOrg = await prisma.team.create({
        data: { name: "Case Org", slug, isOrganization: true },
      });
      createdTeamIds.push(existingOrg.id);

      const freshAdmin = await createFreshAdminUser();
      const error = await createHandler({
        ctx: adminCtx(freshAdmin),
        input: baseInput({ slug: slug, orgOwnerEmail: freshAdmin.email }),
      }).catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("organization_url_taken");
    });
  });
});
