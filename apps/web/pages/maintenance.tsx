import Head from "next/head";

import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

export default function MaintenancePage() {
  const { t, isLocaleReady } = useLocale();
  if (!isLocaleReady) return null;
  return (
    <div className="bg-subtle flex h-screen">
      <Head>
        <title>
          {t("under_maintenance")} | {APP_NAME}
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="text-emphasis text-2xl font-medium">{t("under_maintenance")}</h1>
        <p className="text-default mt-4 mb-6 max-w-2xl text-sm">
          {t("under_maintenance_description", { appName: APP_NAME })}
        </p>
        <Button href={`${WEBSITE_URL}/support`}>{t("contact_support")}</Button>
      </div>
    </div>
  );
}
