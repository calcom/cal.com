import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateNewTeamView, LayoutWrapper } from "~/settings/teams/new/create-new-team-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_team"),
    (t) => t("create_new_team_description"),
    undefined,
    undefined,
    "/settings/teams/new"
  );

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userProfile = session.user.profile;
  const orgId = userProfile?.organizationId ?? session.user.org?.id;

  // If the user is in an org, check if they have the team.create permission
  if (orgId) {
    const permissionCheckService = new PermissionCheckService();
    const canCreateTeam = await permissionCheckService.checkPermission({
      userId: session.user.id,
      teamId: orgId,
      permission: "team.create",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!canCreateTeam) {
      return redirect("/teams");
    }
  }

  const userEmail = session.user.email || "";

  return (
    <LayoutWrapper>
      <CreateNewTeamView userEmail={userEmail} />
    </LayoutWrapper>
  );
};

export default ServerPage;
