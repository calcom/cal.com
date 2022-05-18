import { useLocale } from "@calcom/lib/hooks/useLocale";
import ApiKeyListContainer from "@ee/components/apiKeys/ApiKeyListContainer";

import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import WebhookListContainer from "@components/webhook/WebhookListContainer";

export default function Settings() {
  const { t } = useLocale();

  return (
    <Shell heading={t("developer")} subtitle={t("manage_developer_settings")}>
      <SettingsShell>
        <WebhookListContainer title={t("webhooks")} subtitle={t("receive_cal_meeting_data")} />
        <ApiKeyListContainer />
      </SettingsShell>
    </Shell>
  );
}
