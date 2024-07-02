"use client";

import { AboutOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta, WizardLayout, WizardLayoutAppDir } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

const AboutOrganizationPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("about_your_organization")} description={t("about_your_organization_description")} />
      <AboutOrganizationForm />
    </>
  );
};
export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={3} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

export const WrappedAboutOrganizationPage = (page: React.ReactElement) => {
  return (
    <WizardLayoutAppDir currentStep={3} maxSteps={5}>
      {page}
    </WizardLayoutAppDir>
  );
};

AboutOrganizationPage.getLayout = LayoutWrapper;
AboutOrganizationPage.PageWrapper = PageWrapper;

export default AboutOrganizationPage;
