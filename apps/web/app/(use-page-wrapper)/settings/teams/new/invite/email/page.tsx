import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { APP_NAME } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeamInviteEmailView } from "~/settings/teams/new/invite/email/team-invite-email-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("invite")}`,
    () => "",
    true,
    undefined,
    "/settings/teams/new/invite/email"
  );
};

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

  return <TeamInviteEmailView userEmail={userEmail} />;
};

export default ServerPage;
