import { useRouter } from "next/router";

import { AboutOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const AboutOrganizationPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Meta title={t("about_your_organization")} description={t("about_your_organization_description")} />
      <AboutOrganizationForm />
    </>
  );
};
const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={3} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

AboutOrganizationPage.getLayout = LayoutWrapper;
AboutOrganizationPage.PageWrapper = PageWrapper;

export default AboutOrganizationPage;
