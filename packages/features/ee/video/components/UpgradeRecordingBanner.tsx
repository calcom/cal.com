import { useRouter } from "next/router";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, Button } from "@calcom/ui";

export default function UpgradeRecordingBanner() {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="flex items-start gap-2 rounded-md bg-gray-100 p-4">
      <Icon.FiUsers className="dark:bg-gray-90 inline-block h-5 w-5" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{t("upgrade_to_access_recordings_title")}</h2>
          <p className="text-sm font-normal">{t("upgrade_to_access_recordings_description")}</p>
        </div>
        <div>
          <Button
            onClick={() => {
              router.push(`${WEBAPP_URL}/teams`);
            }}>
            {t("upgrade_now")}
          </Button>
        </div>
      </div>
    </div>
  );
}
