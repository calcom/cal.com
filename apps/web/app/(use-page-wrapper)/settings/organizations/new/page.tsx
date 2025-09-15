import { _generateMetadata } from "app/_utils";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/new/create-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_organization"),
    (t) => t("organizations_description"),
    undefined,
    undefined,
    "/settings/organizations/new"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <LicenseRequired>
        <LegacyPage />
      </LicenseRequired>
    </LayoutWrapper>
  );
};

export default ServerPage;
