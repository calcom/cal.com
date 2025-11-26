import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { Resource, CustomAction, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { MembersView } from "~/members/members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description"),
    undefined,
    undefined,
    "/settings/organizations/members"
  );

const getCachedAttributes = unstable_cache(
  async (orgId: number) => {
    const attributeRepo = new PrismaAttributeRepository(prisma);

    return await attributeRepo.findAllByOrgIdWithOptions({ orgId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.attributes.list"] } // Cache for 1 hour
);

const getCachedRoles = unstable_cache(
  async (orgId: number) => {
    const roleManager = await RoleManagementFactory.getInstance().createRoleManager(orgId);
    return await roleManager.getAllRoles(orgId);
  },
  undefined,
  { revalidate: 3600, tags: ["pbac.roles.list"] } // Cache for 1 hour
);

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/profile");
  }

  const orgCaller = await createRouterCaller(viewerOrganizationsRouter);
  const [org, teams] = await Promise.all([orgCaller.listCurrent(), orgCaller.getTeams()]);
  const [attributes, roles] = await Promise.all([getCachedAttributes(org.id), getCachedRoles(org.id)]);

  const fallbackRolesThatCanSeeMembers: MembershipRole[] = [MembershipRole.ADMIN, MembershipRole.OWNER];

  if (!org?.isPrivate) {
    fallbackRolesThatCanSeeMembers.push(MembershipRole.MEMBER);
  }

  // Get specific PBAC permissions for organization member actions
  const [orgPermissions, attributesPermissions] = await Promise.all([
    getSpecificPermissions({
      userId: session.user.id,
      teamId: session.user.profile.organizationId,
      resource: Resource.Organization,
      userRole: session.user.org.role,
      actions: [
        CustomAction.ListMembers,
        CustomAction.ListMembersPrivate,
        CustomAction.Invite,
        CustomAction.ChangeMemberRole,
        CustomAction.Remove,
        CustomAction.Impersonate,
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
      },
    }),
    getSpecificPermissions({
      userId: session.user.id,
      teamId: session.user.profile.organizationId,
      resource: Resource.Attributes,
      userRole: session.user.org.role,
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

  // Map specific permissions to member actions
  const memberPermissions = {
    canListMembers: org.isPrivate
      ? orgPermissions[CustomAction.ListMembersPrivate]
      : orgPermissions[CustomAction.ListMembers],
    canInvite: orgPermissions[CustomAction.Invite],
    canChangeMemberRole: orgPermissions[CustomAction.ChangeMemberRole],
    canRemove: orgPermissions[CustomAction.Remove],
    canImpersonate: orgPermissions[CustomAction.Impersonate],
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

  return (
    <MembersView
      org={org}
      teams={teams}
      facetedTeamValues={facetedTeamValues}
      attributes={attributes}
      permissions={memberPermissions}
    />
  );
};

export default Page;
