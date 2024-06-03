"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { CreateANewLicenseKeyForm } from "@calcom/features/ee/deployment/licensekey/CreateLicenseKeyForm";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import { getServerSideProps } from "@lib/settings/license-keys/new/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

const CreateNewLicenseKeyPage = () => {
  const { t } = useLocale();
  return (
    <LicenseRequired>
      <Meta title={t("set_up_your_organization")} description={t("organizations_description")} />
      <CreateANewLicenseKeyForm />
    </LicenseRequired>
  );
};
const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={2}>
      {page}
    </WizardLayout>
  );
};

CreateNewLicenseKeyPage.getLayout = LayoutWrapper;
CreateNewLicenseKeyPage.PageWrapper = PageWrapper;

export default CreateNewLicenseKeyPage;
export { getServerSideProps };
