import Head from "next/head";
import { useRouter } from "next/router";

import { AboutOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const AboutOrganizationPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Head>
        <title>About your organization</title>
        <meta
          name="description"
          content="Organizations are shared environments where you can create multiple teams with shared members, event types, apps, workflows and more."
        />
      </Head>
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
