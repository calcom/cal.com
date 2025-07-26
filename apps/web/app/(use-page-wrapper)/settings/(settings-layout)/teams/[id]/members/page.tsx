import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata, getTranslate } from "app/_utils";
import { unstable_cache } from "next/cache";

import { RoleManagementFactory } from "@calcom/features/pbac/services/role-management.factory";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { AttributeRepository } from "@calcom/lib/server/repository/attribute";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";

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
    try {
      return await AttributeRepository.findAllByOrgIdWithOptions({ orgId: organizationId });
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
      <TeamMembersView team={team} facetedTeamValues={facetedTeamValues} attributes={attributes} />
    </SettingsHeader>
  );
};

export default Page;
