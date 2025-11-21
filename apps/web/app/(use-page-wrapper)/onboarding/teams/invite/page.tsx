import { _generateMetadata } from "app/_utils";
import type { PageProps } from "app/_types";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { TeamInviteView } from "~/onboarding/teams/invite/team-invite-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("team_invite")}`,
    () => "",
    true,
    undefined,
    "/onboarding/teams/invite"
  );
};

const ServerPage = async ({ searchParams }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    return redirect("/onboarding/teams/invite/email");
  }

  const userEmail = session.user.email || "";
  const resolvedSearchParams = await searchParams;
  const teamId = resolvedSearchParams.teamId ? Number(resolvedSearchParams.teamId) : null;

  return <TeamInviteView userEmail={userEmail} teamId={teamId} />;
};

export default ServerPage;
