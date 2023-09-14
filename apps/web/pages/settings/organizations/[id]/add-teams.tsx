import type { AppProps as NextAppProps } from "next/app";

import { AddNewTeamsForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta, WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

const AddNewTeamsPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("create_your_teams")} description={t("create_your_teams_description")} />
      <AddNewTeamsForm />
    </>
  );
};

AddNewTeamsPage.getLayout = (page: React.ReactElement, router: NextAppProps["router"]) => (
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
