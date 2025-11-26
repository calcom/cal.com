"use client";

import { useRouter } from "next/navigation";

import { CreateButtonWithTeamsList } from "@calcom/features/ee/teams/components/createButton/CreateButtonWithTeamsList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";

export const CreateNewWebhookButton = () => {
  const router = useRouter();
  const { t } = useLocale();
  const createFunction = (teamId?: number, platform?: boolean) => {
    if (platform) {
      router.push(`webhooks/new${platform ? `?platform=${platform}` : ""}`);
    } else {
      router.push(`webhooks/new${teamId ? `?teamId=${teamId}` : ""}`);
    }
  };

  return (
    <CreateButtonWithTeamsList
      color="secondary"
      subtitle={t("create_for").toUpperCase()}
      createFunction={createFunction}
      data-testid="new_webhook"
      includeOrg={true}
      withPermission={{
        permission: "webhook.create",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      }}
    />
  );
};

export default CreateNewWebhookButton;
