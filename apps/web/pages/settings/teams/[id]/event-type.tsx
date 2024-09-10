"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";

import { TeamEventTypeForm } from "@calcom/features/ee/teams/components/TeamEventTypeForm";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";
import { Button, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export const CreateTeamEventType = () => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const router = useRouter();
  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;

  const onSuccessMutation = () => {
    router.push(`/settings/teams/${teamId}/profile`);
  };

  const onErrorMutation = (err: string) => {
    showToast(err, "error");
  };

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

  return (
    <TeamEventTypeForm
      isTeamAdminOrOwner={true}
      teamId={teamId}
      SubmitButton={SubmitButton}
      onSuccessMutation={onSuccessMutation}
      onErrorMutation={onErrorMutation}
      isInfiniteScrollEnabled={false}
    />
  );
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

export const GetLayout = (page: React.ReactElement) => {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;

  return (
    <WizardLayout
      currentStep={3}
      maxSteps={3}
      isOptionalCallback={() => {
        router.push(`/settings/teams/${teamId}/profile`);
      }}>
      {page}
    </WizardLayout>
  );
};

TeamEventTypePage.getLayout = GetLayout;
TeamEventTypePage.PageWrapper = PageWrapper;

export default TeamEventTypePage;
