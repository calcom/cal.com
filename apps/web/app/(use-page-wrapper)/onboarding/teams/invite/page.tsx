import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { TeamInviteEmailView } from "~/onboarding/teams/invite/email/team-invite-email-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("team_invite")}`,
    () => "",
    true,
    undefined,
    "/onboarding/teams/invite"
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  // If user is not ADMIN, show the email view directly instead of redirecting
  if (session.user.role !== "ADMIN") {
    return <TeamInviteEmailView userEmail={userEmail} />;
  }

  return <TeamInviteEmailView userEmail={userEmail} />;
};

export default ServerPage;
