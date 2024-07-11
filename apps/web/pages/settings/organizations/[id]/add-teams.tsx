"use client";

import { AddNewTeamsForm } from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta, WizardLayout } from "@calcom/ui";
import { WizardLayoutAppDir } from "@calcom/ui";

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

AddNewTeamsPage.getLayout = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={5} maxSteps={5}>
      {page}
    </WizardLayout>
  );
};

AddNewTeamsPage.PageWrapper = PageWrapper;

export const WrapperAddNewTeamsPage = (page: React.ReactElement) => {
  return (
    <WizardLayoutAppDir currentStep={5} maxSteps={5}>
      {page}
    </WizardLayoutAppDir>
  );
};

export default AddNewTeamsPage;
