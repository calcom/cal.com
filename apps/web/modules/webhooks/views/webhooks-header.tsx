"use client";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";
import type { ReactNode } from "react";

export function WebhooksHeader({ actions }: { actions?: ReactNode }) {
  const { t } = useLocale();

  return (
    <AppHeader>
      <AppHeaderContent title={t("webhooks")}>
        <AppHeaderDescription>{t("add_webhook_description", { appName: APP_NAME })}</AppHeaderDescription>
      </AppHeaderContent>
      {actions ? <AppHeaderActions>{actions}</AppHeaderActions> : null}
    </AppHeader>
  );
}
