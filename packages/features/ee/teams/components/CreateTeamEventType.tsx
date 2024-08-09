import type { EventType } from "@prisma/client";
import { useRouter } from "next/navigation";

import { TeamEventTypeForm } from "@calcom/features/ee/teams/components/TeamEventTypeForm";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

export const CreateTeamEventType = () => {
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();

  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;

  const handleSuccessMutation = (eventType: EventType) => {
    router.push(`/settings/teams/${teamId}/profile`);
  };

  const submitButton = (isPending: boolean) => {
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
      isAdmin={true}
      teamId={teamId}
      submitButton={submitButton}
      handleSuccessMutation={handleSuccessMutation}
    />
  );
};
