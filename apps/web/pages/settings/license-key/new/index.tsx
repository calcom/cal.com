"use client";

import { CreateANewLicenseKeyForm } from "@calcom/features/ee/deployment/licensekey/CreateLicenseKeyForm";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import { getServerSideProps } from "@lib/settings/license-keys/new/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

const CreateNewLicenseKeyPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("set_up_your_organization")} description={t("organizations_description")} />
      <CreateANewLicenseKeyForm />
    </>
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
