"use client";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { CreateANewOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

const CreateNewOrganizationPage = ({ querySlug }: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();
  return (
    <LicenseRequired>
      <Meta title={t("set_up_your_organization")} description={t("organizations_description")} />
      <CreateANewOrganizationForm />
    </LicenseRequired>
  );
};
export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

CreateNewOrganizationPage.getLayout = LayoutWrapper;
CreateNewOrganizationPage.PageWrapper = PageWrapper;

export default CreateNewOrganizationPage;

export { getServerSideProps };
