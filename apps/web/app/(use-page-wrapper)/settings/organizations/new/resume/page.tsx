import { _generateMetadata } from "app/_utils";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/new/resume-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("resume_onboarding"),
    (t) => t("resume_onboarding_description"),
    undefined,
    undefined,
    "/settings/organizations/new/resume"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <LegacyPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
