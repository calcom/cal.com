import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

export const organizationSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  bio: true,
  isPlatform: true,
  organizationSettings: true,
} as const;

export const normalizeOrganizationSlug = (slug: string) => slugify(slug).toLowerCase();

export const getEmailDomain = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain || "local";
};

export const getProfileUsername = (user: { username?: string | null; email: string }) => {
  return normalizeOrganizationSlug(user.username || user.email.split("@")[0] || "member");
};

export const assertOrganizationSlugAvailable = async ({
  slug,
  currentOrganizationId,
}: {
  slug: string;
  currentOrganizationId?: number;
}) => {
  const existing = await prisma.team.findFirst({
    where: {
      slug,
      parentId: null,
      ...(currentOrganizationId ? { id: { not: currentOrganizationId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: "Organization slug is already in use." });
  }
};

export const findCurrentOrganizationMembership = async ({ userId }: { userId: number }) => {
  return prisma.membership.findFirst({
    where: {
      userId,
      accepted: true,
      team: {
        isOrganization: true,
      },
    },
    select: {
      role: true,
      team: {
        select: organizationSelect,
      },
    },
  });
};

export const assertCanManageOrganization = async ({ userId }: { userId: number }) => {
  const membership = await findCurrentOrganizationMembership({ userId });

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const rolesWithWriteAccess: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];

  if (!rolesWithWriteAccess.includes(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to update this organization." });
  }

  return membership;
};
