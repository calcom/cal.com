"use client";

import { TeamSelectionDialog } from "@calid/features/modules/teams/components/TeamSelectionDialog";
import { Button } from "@calid/features/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export const CreateNewWebhookButton = ({ isAdmin }: { isAdmin: boolean }) => {
  const router = useRouter();
  const { t } = useLocale();
  const createFunction = (teamId?: number, platform?: boolean) => {
    if (platform) {
      router.push(`webhooks/new${platform ? `?platform=${platform}` : ""}`);
    } else {
      router.push(`webhooks/new${teamId ? `?teamId=${teamId}` : ""}`);
    }
  };

  const [selectTeamDialogState, setSelectTeamDialogState] = useState<SelectTeamDialogState>(null);

  return (
    <>
      <TeamSelectionDialog
        open={selectTeamDialogState}
        openChange={(open: boolean) => !open && setSelectTeamDialogState(null)}
        onTeamSelect={createFunction}
      />
      <Button
        onClick={() => {
          setSelectTeamDialogState({ target: null });
        }}>
        {t("create")}
      </Button>
    </>
  );
};

export default CreateNewWebhookButton;
