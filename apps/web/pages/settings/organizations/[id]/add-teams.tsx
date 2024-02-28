"use client";

import { redirect, useRouter } from "next/navigation";

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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const router = useRouter();

  return (
    <WizardLayout
      currentStep={5}
      maxSteps={5}
      isOptionalCallback={() => {
        router.push(`/event-types`);
      }}>
      {page}
    </WizardLayout>
  );
};

AddNewTeamsPage.PageWrapper = PageWrapper;

export const WrapperAddNewTeamsPage = (page: React.ReactElement) => {
  return (
    <WizardLayoutAppDir
      currentStep={5}
      maxSteps={5}
      isOptionalCallback={() => {
        redirect(`/event-types`);
      }}>
      {page}
    </WizardLayoutAppDir>
  );
};

export default AddNewTeamsPage;
