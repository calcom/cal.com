import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui/components/button";

import TeamsListingView from "./TeamsListingView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("admin_teams_description"),
    undefined,
    undefined,
    "/settings/admin/teams"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("teams")}
      description={t("admin_teams_description")}
      CTA={
        <div className="mt-4 space-x-5 sm:ml-16 sm:mt-0 sm:flex-none">
          <Button href="/settings/admin/teams/add">Add team</Button>
        </div>
      }>
      <TeamsListingView />
    </SettingsHeader>
  );
};

export default Page;
