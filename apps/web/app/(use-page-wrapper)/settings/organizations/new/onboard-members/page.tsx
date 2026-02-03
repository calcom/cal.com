import { _generateMetadata } from "app/_utils";

import LegacyPage, { LayoutWrapper } from "~/ee/organizations/new/onboard-members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("invite_organization_admins"),
    (t) => t("invite_organization_admins_description"),
    undefined,
    undefined,
    "/settings/organizations/new/onboard-members"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
