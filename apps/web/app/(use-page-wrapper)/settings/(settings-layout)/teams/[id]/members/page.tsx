import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { TeamMembersView } from "~/teams/team-members-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description"),
    undefined,
    undefined,
    `/settings/teams/${(await params).id}/members`
  );

const getCachedTeamRoles = unstable_cache(
  async (teamId: number, organizationId?: number) => {
    if (!organizationId) return []; // Fallback to traditional roles
    try {
      const roleManager = await RoleManagementFactory.getInstance().createRoleManager(organizationId);
      return await roleManager.getTeamRoles(teamId);
    } catch (error) {
      // PBAC not enabled or error occurred, return empty array
      return [];
    }
  },
  undefined,
  { revalidate: 3600, tags: ["pbac.team.roles.list"] } // Cache for 1 hour
);

const getCachedTeamAttributes = unstable_cache(
  async (organizationId?: number) => {
    if (!organizationId) return [];
    const attributeRepo = new PrismaAttributeRepository(prisma);

    try {
      return await attributeRepo.findAllByOrgIdWithOptions({ orgId: organizationId });
    } catch (error) {
      return [];
    }
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.attributes.list"] } // Cache for 1 hour
);

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const t = await getTranslate();
  const { id } = await params;
  const teamId = parseInt(id);

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user.id) {
    return redirect("/auth/login");
  }

  const teamCaller = await createRouterCaller(viewerTeamsRouter);
  const team = await teamCaller.get({ teamId });

  if (!team) {
    throw new Error("Team not found");
  }

  // Get organization ID (either the team's parent or the team itself if it's an org)
  const organizationId = team.parentId || teamId;

  // Load PBAC roles and attributes if available
  const [roles, attributes] = await Promise.all([
    getCachedTeamRoles(teamId, organizationId),
    getCachedTeamAttributes(organizationId),
  ]);

  const fallbackRolesCanListMembers: MembershipRole[] = [MembershipRole.ADMIN, MembershipRole.OWNER];

  // If the team is not private we allow members to list other members
  if (!team.isPrivate) {
    fallbackRolesCanListMembers.push(MembershipRole.MEMBER);
  }

  // Get specific PBAC permissions for team member actions
  const permissions = await getSpecificPermissions({
    userId: session.user.id,
    teamId: teamId,
    resource: Resource.Team,
    userRole: team.membership.role,
    actions: [
      CustomAction.Invite,
      CustomAction.ChangeMemberRole,
      CustomAction.Remove,
      CustomAction.ListMembers,
      CustomAction.ListMembersPrivate,
      CustomAction.Impersonate,
    ],
    fallbackRoles: {
      [CustomAction.Invite]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.ChangeMemberRole]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.Remove]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.ListMembers]: {
        roles: fallbackRolesCanListMembers,
      },
      [CustomAction.Impersonate]: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      [CustomAction.ListMembersPrivate]: {
        roles: fallbackRolesCanListMembers,
      },
    },
  });

  // Map specific permissions to member actions
  const memberPermissions = {
    canListMembers: team.isPrivate
      ? permissions[CustomAction.ListMembersPrivate]
      : permissions[CustomAction.ListMembers],
    canInvite: permissions[CustomAction.Invite],
    canChangeMemberRole: permissions[CustomAction.ChangeMemberRole],
    canRemove: permissions[CustomAction.Remove],
    canImpersonate: permissions[CustomAction.Impersonate],
  };

  const facetedTeamValues = {
    roles,
    teams: [team],
    attributes: attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      options: Array.from(new Set(attribute.options.map((option) => option.value))).map((value) => ({
        value,
      })),
    })),
  };

  return (
    <SettingsHeader title={t("team_members")} description={t("members_team_description")}>
      <TeamMembersView
        team={team}
        facetedTeamValues={facetedTeamValues}
        attributes={attributes}
        permissions={memberPermissions}
      />
    </SettingsHeader>
  );
};

export default Page;
