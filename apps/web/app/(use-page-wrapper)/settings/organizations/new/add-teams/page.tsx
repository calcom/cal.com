import { _generateMetadata } from "app/_utils";
import LegacyPage, { LayoutWrapper } from "~/ee/organizations/new/add-teams-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_teams"),
    (t) => t("create_your_teams_description"),
    undefined,
    undefined,
    "/settings/organizations/new/add-teams"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
