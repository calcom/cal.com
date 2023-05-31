import Head from "next/head";
import { useRouter } from "next/router";

import { AddNewTeamsForm } from "@calcom/features/ee/organizations/components";
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
        <title>Create your teams</title>
        <meta
          name="description"
          content="Start scheduling together by adding your team members to your organization"
        />
      </Head>
      <AddNewTeamsForm />
    </>
  );
};

OnboardTeamMembersPage.getLayout = (page: React.ReactElement) => (
  <>
    <WizardLayout
      currentStep={5}
      maxSteps={5}
      isOptionalCallback={() => {
        window.location.replace(`/getting-started`);
      }}>
      {page}
    </WizardLayout>
  </>
);

OnboardTeamMembersPage.PageWrapper = PageWrapper;

export default OnboardTeamMembersPage;
