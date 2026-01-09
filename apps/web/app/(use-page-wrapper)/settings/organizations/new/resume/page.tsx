import { _generateMetadata } from "app/_utils";

import ResumeOnboardingPage, { LayoutWrapper } from "~/ee/organizations/new/resume-view";

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
      <ResumeOnboardingPage />
    </LayoutWrapper>
  );
};

export default ServerPage;
