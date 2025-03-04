import { ShellMainAppDir } from "app/[lang]/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import TeamsView, { TeamsCTA } from "~/teams/teams-view";

export const generateMetadata = async ({ params }: ServerPageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("teams"), t("create_manage_teams_collaborative"));
};

const ServerPage = async ({ searchParams, params }: ServerPageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  const token = Array.isArray(searchParams?.token) ? searchParams.token[0] : searchParams?.token;
  const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;

  if (!session) {
    redirect(callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login");
  }

  const t = await getTranslate(params.lang);

  return (
    <ShellMainAppDir
      CTA={<TeamsCTA />}
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}>
      <TeamsView />
    </ShellMainAppDir>
  );
};
export default ServerPage;
