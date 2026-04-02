import { _generateMetadata } from "app/_utils";
import LegacyPage, { LayoutWrapper } from "~/ee/organizations/new/onboarding-handover";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("handover_onboarding_page_title"),
    (t) => t("handover_onboarding_page_description"),
    undefined,
    undefined,
    "/settings/organizations/new/handover"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
