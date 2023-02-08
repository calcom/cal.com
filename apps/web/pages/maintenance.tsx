import Head from "next/head";

import { APP_NAME, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

export default function MaintenancePage() {
  const { t, isLocaleReady } = useLocale();
  if (!isLocaleReady) return null;
  return (
    <div className="flex h-screen bg-gray-100">
      <Head>
        <title>
          {t("under_maintenance")} | {APP_NAME}
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="m-auto rounded-md bg-white p-10 text-right ltr:text-left">
        <h1 className="text-2xl font-medium text-black">{t("under_maintenance")}</h1>
        <p className="mt-4 mb-6 max-w-2xl text-sm text-gray-600">
          {t("under_maintenance_description", { appName: APP_NAME })}
        </p>
        <Button href={`${WEBSITE_URL}/support`}>{t("contact_support")}</Button>
      </div>
    </div>
  );
}
