"use client";

import { useRouter } from "next/navigation";

import { TeamEventTypeForm } from "@calcom/features/ee/teams/components/TeamEventTypeForm";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { WizardLayout } from "@calcom/ui";
import { Button, showToast } from "@calcom/ui";

export const CreateTeamEventType = () => {
  const searchParams = useSearchParams();
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
    />
  );
};

export const GetLayout = (page: React.ReactElement) => {
  const router = useRouter();
  const searchParams = useSearchParams();
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

export default CreateTeamEventType;
