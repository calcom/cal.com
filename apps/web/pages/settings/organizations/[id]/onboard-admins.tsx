import Head from "next/head";
import { useRouter } from "next/router";

import { AddNewOrgAdminsForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const OnboardTeamMembersPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Head>
        <title>Invite your organization admins</title>
        <meta
          name="description"
          content="These admins will have access to all teams in your organization. You can add team admins and members later."
        />
      </Head>
      <AddNewOrgAdminsForm />
    </>
  );
};

OnboardTeamMembersPage.getLayout = (page: React.ReactElement) => (
  <WizardLayout currentStep={4} maxSteps={5}>
    {page}
  </WizardLayout>
);

OnboardTeamMembersPage.PageWrapper = PageWrapper;

export default OnboardTeamMembersPage;
