import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon } from "@calcom/ui";

export default function AppNotInstalledMessage({ appName }: { appName: string }) {
  const { t } = useLocale();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-md bg-white p-10 text-black">
      <div className="flex w-1/3 flex-col items-center rounded-lg border border-[#E5E7EB] p-10 shadow-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Icon name="circle-alert" className="h-10 w-10 text-gray-800" />
        </div>
        <div className="mb-2 mt-4 text-2xl font-bold">{t("app_not_installed")}</div>
        <h2 className="mt-4 text-lg text-[#4B5563]">{t("visit_our_app_store")}</h2>

        <div className="mt-5">
          <Link href={`/apps/${appName}`} passHref={true} legacyBehavior>
            <Button className="border">
              {t("go_to_app_store")}
              <Icon name="arrow-up-right" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
