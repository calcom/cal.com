"use client";

import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

export default function MaintenancePage() {
  const { t } = useLocale();
  return (
    <div className="bg-subtle flex h-screen">
      <div className="bg-default m-auto rounded-md p-10 text-right ltr:text-left">
        <h1 className="text-emphasis text-2xl font-medium">{t("under_maintenance")}</h1>
        <p className="text-default mb-6 mt-4 max-w-2xl text-sm">{t("maintenance_message")}</p>
        <Button href={`${WEBSITE_URL}/support`}>{t("contact_support")}</Button>
      </div>
    </div>
  );
}
