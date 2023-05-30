import Head from "next/head";

import { AboutOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const CreateNewOrganizationPage = () => {
  const { t } = useLocale();
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
    <WizardLayout currentStep={2} maxSteps={4}>
      {page}
    </WizardLayout>
  );
};

CreateNewOrganizationPage.getLayout = LayoutWrapper;
CreateNewOrganizationPage.PageWrapper = PageWrapper;

export default CreateNewOrganizationPage;
