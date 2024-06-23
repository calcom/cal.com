"use client";

import Head from "next/head";

import { CreateTeamEventType } from "@calcom/features/ee/teams/components/CreateTeamEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const TeamEventTypePage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("add_new_team_event_type")}</title>
        <meta name="description" content={t("new_event_type_to_book_description")} />
      </Head>
      <CreateTeamEventType />
    </>
  );
};

export const GetLayout = (page: React.ReactElement) => (
  <WizardLayout currentStep={3} maxSteps={3}>
    {page}
  </WizardLayout>
);

TeamEventTypePage.getLayout = GetLayout;
TeamEventTypePage.PageWrapper = PageWrapper;

export default TeamEventTypePage;
