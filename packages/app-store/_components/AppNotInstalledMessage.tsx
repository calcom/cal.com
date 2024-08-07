import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon } from "@calcom/ui";

export default function AppNotInstalledMessage({ appName }: { appName: string }) {
  const { t } = useLocale();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white px-6 text-black">
      <div className="m-10 flex w-2/5 flex-col items-center rounded-xl border border-[#E5E7EB] px-8 py-14 text-center shadow-md">
        <div className="rounded-full bg-gray-100 p-3">
          <Icon name="circle-alert" className="h-10 w-10 flex-shrink-0 p-0.5 font-extralight text-gray-800" />
        </div>
        <h3 className="font-cal my-6 text-2xl font-normal leading-none">{t("app_not_installed")}</h3>
        <p className="font-normal text-[#4B5563]">{t("visit_our_app_store")}</p>

        <div className="mt-8">
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
