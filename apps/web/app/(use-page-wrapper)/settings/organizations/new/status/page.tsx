import { _generateMetadata } from "app/_utils";
import LegacyPage, { LayoutWrapper } from "~/ee/organizations/new/payment-status-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_onboarding_status"),
    (t) => t("organization_onboarding_status_description"),
    undefined,
    undefined,
    "/settings/organizations/new/status"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
