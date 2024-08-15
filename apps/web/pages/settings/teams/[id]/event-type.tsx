"use client";

import Head from "next/head";

import { TeamEventTypeForm } from "@calcom/features/ee/teams/components/TeamEventTypeForm";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";
import { Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export const CreateTeamEventType = () => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();

  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;
  const SubmitButton = (isPending: boolean) => {
    return (
      <Button
        data-testid="finish-button"
        type="submit"
        color="primary"
        className="w-full justify-center"
        disabled={isPending}>
        {t("finish")}
      </Button>
    );
  };

  return <TeamEventTypeForm isTeamAdminOrOwner={true} teamId={teamId} SubmitButton={SubmitButton} />;
};

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
