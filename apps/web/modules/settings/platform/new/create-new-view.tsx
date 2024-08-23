"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { CreateANewPlatformForm } from "@calcom/features/ee/platform/components/index";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

const CreateNewOrganizationPage = () => {
  const { t } = useLocale();
  return (
    <LicenseRequired>
      <Meta
        title={t("set_up_your_platform_organization")}
        description={t("platform_organization_description")}
      />
      <CreateANewPlatformForm />
    </LicenseRequired>
  );
};
export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={1}>
      {page}
    </WizardLayout>
  );
};

export default CreateNewOrganizationPage;
