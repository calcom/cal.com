import { _generateMetadata } from "app/_utils";
import LegacyPage, { LayoutWrapper } from "~/ee/organizations/new/about-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("about_your_organization"),
    (t) => t("about_your_organization_description"),
    undefined,
    undefined,
    "/settings/organizations/new/about"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
