import Head from "next/head";

import { CreateANewOrganizationForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const CreateNewTeamPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("set_up_your_organization")}</title>
        <meta name="description" content={t("organizations_description")} />
      </Head>
      <CreateANewOrganizationForm />
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

CreateNewTeamPage.getLayout = LayoutWrapper;
CreateNewTeamPage.PageWrapper = PageWrapper;

export default CreateNewTeamPage;
