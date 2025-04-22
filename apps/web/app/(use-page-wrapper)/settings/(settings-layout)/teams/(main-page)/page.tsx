import { ServerTeamsListing } from "app/(use-page-wrapper)/(main-nav)/teams/server-page";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative"),
    undefined,
    undefined,
    "/settings/teams"
  );

const Page = async ({ params, searchParams }: PageProps) => {
  const t = await getTranslate();
  const { Main } = await ServerTeamsListing({ params, searchParams });

  return (
    <SettingsHeader title={t("teams")} description={t("create_manage_teams_collaborative")}>
      {Main}
    </SettingsHeader>
  );
};

export default Page;
