"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CreateButtonWithTeamsList } from "@calcom/ui";

export const CreateNewWebhookButton = ({ isAdmin }: { isAdmin: boolean }) => {
  const createFunction = (teamId?: number, platform?: boolean) => {
    if (platform) {
      router.push(`webhooks/new${platform ? `?platform=${platform}` : ""}`);
    } else {
      router.push(`webhooks/new${teamId ? `?teamId=${teamId}` : ""}`);
    }
  };

  const { t } = useLocale();
  return (
    <CreateButtonWithTeamsList
      color="secondary"
      subtitle={t("create_for").toUpperCase()}
      isAdmin={isAdmin}
      createFunction={createFunction}
      data-testid="new_webhook"
      includeOrg={true}
    />
  );
};

export default CreateNewWebhookButton;
