"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

export default function AppSettingsInterface({ slug }: { slug: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <>
      {/* Toast notifications will be handled by the global toast provider */}
      <div className="flex flex-col justify-between md:flex-row">
        <div>
          <div className="flex flex-row items-center">
            <Icon name="grid-3x3" className="mr-2 h-8 w-8 text-green-500" />
            <h2 className="text-lg font-semibold">{t("google_sheets_integration")}</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">{t("google_sheets_description")}</p>
        </div>
      </div>
      <div className="mt-8 rounded-md border">
        <div className="flex flex-col p-6">
          <h3 className="text-base font-medium">{t("connect_google_sheets")}</h3>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-md border p-4">
              <h4 className="font-medium">{t("what_can_you_do")}</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-500">
                <li className="flex items-center">
                  <Icon name="check" className="mr-2 h-4 w-4 text-green-500" />
                  {t("automatically_add_bookings")}
                </li>
                <li className="flex items-center">
                  <Icon name="check" className="mr-2 h-4 w-4 text-green-500" />
                  {t("configure_per_event_type")}
                </li>
                <li className="flex items-center">
                  <Icon name="check" className="mr-2 h-4 w-4 text-green-500" />
                  {t("create_new_spreadsheets")}
                </li>
              </ul>
            </div>
            <div className="rounded-md border p-4">
              <h4 className="font-medium">{t("how_to_use")}</h4>
              <ol className="mt-2 space-y-2 text-sm text-gray-500">
                <li>1. {t("connect_your_google_account")}</li>
                <li>2. {t("enable_for_event_types")}</li>
                <li>3. {t("select_spreadsheet_per_event")}</li>
              </ol>
            </div>
          </div>
          <Alert
            className="mt-6"
            severity="info"
            title={t("google_sheets_permissions")}
            message={t("google_sheets_permissions_description")}
          />
          <div className="mt-6">
            <Button
              color="primary"
              disabled={isConnecting}
              onClick={() => {
                setIsConnecting(true);
                fetch(`/api/integrations/${slug}/add`)
                  .then((response) => response.json())
                  .then((data) => {
                    router.push(data.url);
                  })
                  .catch((error) => {
                    console.error("Error connecting to Google Sheets:", error);
                    setIsConnecting(false);
                  });
              }}
              data-testid="connect-google-sheets">
              {isConnecting ? t("connecting") : t("connect")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
