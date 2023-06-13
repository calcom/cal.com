import type { NextRouter } from "next/router";
import { useRouter } from "next/router";

import { AddNewTeamsForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const AddNewTeamsPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Meta title={t("create_your_teams")} description={t("create_your_teams_description")} />
      <AddNewTeamsForm />
    </>
  );
};

AddNewTeamsPage.getLayout = (page: React.ReactElement, router: NextRouter) => (
  <>
    <WizardLayout
      currentStep={5}
      maxSteps={5}
      isOptionalCallback={() => {
        router.push(`/event-types`);
      }}>
      {page}
    </WizardLayout>
  </>
);

AddNewTeamsPage.PageWrapper = PageWrapper;

export default AddNewTeamsPage;
