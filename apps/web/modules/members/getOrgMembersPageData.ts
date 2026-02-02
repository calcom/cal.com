import { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";
import { CrudAction, CustomAction, Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import type { MemberPermissions } from "@calcom/features/pbac/lib/team-member-permissions";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";
import { createRouterCaller } from "app/_trpc/context";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

const getCachedAttributes = unstable_cache(
  async (orgId: number) => {
    const attributeRepo = new PrismaAttributeRepository(prisma);
    return await attributeRepo.findAllByOrgIdWithOptions({ orgId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.attributes.list"] }
);

const getCachedRoles = unstable_cache(
  async (orgId: number) => {
    const roleManager = await RoleManagementFactory.getInstance().createRoleManager(orgId);
    return await roleManager.getAllRoles(orgId);
  },
  undefined,
  { revalidate: 3600, tags: ["pbac.roles.list"] }
);

export async function getOrgMembersPageData(session: Session) {
  const orgCaller = await createRouterCaller(viewerOrganizationsRouter);
  const [org, teams] = await Promise.all([orgCaller.listCurrent(), orgCaller.getTeams()]);

  if (!org) {
    redirect("/settings/my-account/profile");
  }

  const [attributes, roles] = await Promise.all([getCachedAttributes(org.id), getCachedRoles(org.id)]);

  const fallbackRolesThatCanSeeMembers: MembershipRole[] = [MembershipRole.ADMIN, MembershipRole.OWNER];

  if (!org?.isPrivate) {
    fallbackRolesThatCanSeeMembers.push(MembershipRole.MEMBER);
  }

  const [orgPermissions, attributesPermissions] = await Promise.all([
    getSpecificPermissions({
      userId: session.user.id,
      teamId: session.user.profile!.organizationId!,
      resource: Resource.Organization,
      userRole: session.user.org!.role,
      actions: [
        CustomAction.ListMembers,
        CustomAction.ListMembersPrivate,
        CustomAction.Invite,
        CustomAction.ChangeMemberRole,
        CustomAction.Remove,
        CustomAction.Impersonate,
        CustomAction.PasswordReset,
      ],
      fallbackRoles: {
        [CustomAction.ListMembers]: {
          roles: fallbackRolesThatCanSeeMembers,
        },
        [CustomAction.ListMembersPrivate]: {
          roles: fallbackRolesThatCanSeeMembers,
        },
        [CustomAction.Invite]: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        [CustomAction.ChangeMemberRole]: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        [CustomAction.Remove]: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        [CustomAction.Impersonate]: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        [CustomAction.PasswordReset]: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
    }),
    getSpecificPermissions({
      userId: session.user.id,
      teamId: session.user.profile!.organizationId!,
      resource: Resource.Attributes,
      userRole: session.user.org!.role,
      actions: [CrudAction.Read, CustomAction.EditUsers],
      fallbackRoles: {
        [CrudAction.Read]: {
          roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        [CustomAction.EditUsers]: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
    }),
  ]);

  const permissions: MemberPermissions = {
    canListMembers: org.isPrivate
      ? orgPermissions[CustomAction.ListMembersPrivate]
      : orgPermissions[CustomAction.ListMembers],
    canInvite: orgPermissions[CustomAction.Invite],
    canChangeMemberRole: orgPermissions[CustomAction.ChangeMemberRole],
    canRemove: orgPermissions[CustomAction.Remove],
    canImpersonate: orgPermissions[CustomAction.Impersonate],
    canResetPassword: orgPermissions[CustomAction.PasswordReset],
    canViewAttributes: attributesPermissions[CrudAction.Read],
    canEditAttributesForUser: attributesPermissions[CustomAction.EditUsers],
  };

  const facetedTeamValues = {
    roles,
    teams,
    attributes: attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      options: Array.from(new Set(attribute.options.map((option) => option.value))).map((value) => ({
        value,
      })),
    })),
  };

  return {
    org,
    teams,
    facetedTeamValues,
    attributes,
    permissions,
  };
}
