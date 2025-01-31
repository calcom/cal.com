import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/teams/getServerSideProps";

import type { PageProps as ClientPageProps } from "~/teams/teams-view";
import TeamsView, { TeamsCTA } from "~/teams/teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

const getData = withAppDirSsr<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(context);
  const t = await getTranslate();

  return (
    <ShellMainAppDir
      CTA={<TeamsCTA />}
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}>
      <TeamsView {...props} />;
    </ShellMainAppDir>
  );
};
export default ServerPage;
