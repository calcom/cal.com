import ApiKeyListContainer from "@calcom/features/ee/api-keys/components/ApiKeyListContainer";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import SettingsShell from "@components/SettingsShell";
import WebhookListContainer from "@components/webhook/WebhookListContainer";

export default function Settings() {
  const { t } = useLocale();
  const { data: routingForms } = trpc.useQuery([
    "viewer.appById",
    {
      appId: "routing_forms",
    },
  ]);

  return (
    <SettingsShell heading={t("developer")} subtitle={t("manage_developer_settings")}>
      <WebhookListContainer title="Event Webhooks" subtitle={t("receive_cal_meeting_data")} />
      {routingForms && (
        <WebhookListContainer
          appId="routing_forms"
          title="Routing Webhooks"
          subtitle="Receive Routing Form responses at a specified URL, in real-time, when a Routing Form is submitted"
        />
      )}
      <ApiKeyListContainer />
    </SettingsShell>
  );
}
