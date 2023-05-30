import Head from "next/head";

import AddNewOrganizationAdmins from "@calcom/features/ee/organizations/components/AddNewOrganizationAdmins";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const OnboardTeamMembersPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("add_team_members")}</title>
        <meta name="description" content={t("add_team_members_description")} />
      </Head>
      <AddNewOrganizationAdmins />
    </>
  );
};

OnboardTeamMembersPage.getLayout = (page: React.ReactElement) => (
  <WizardLayout currentStep={2} maxSteps={2}>
    {page}
  </WizardLayout>
);

OnboardTeamMembersPage.PageWrapper = PageWrapper;

export default OnboardTeamMembersPage;
