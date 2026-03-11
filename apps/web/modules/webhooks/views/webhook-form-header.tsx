"use client";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type WebhookFormHeaderProps = {
  CTA?: ReactNode;
  titleKey?: "add_webhook" | "edit_webhook" | "create_webhook";
  showBackButton?: boolean;
};

export function WebhookFormHeader({
  CTA,
  titleKey = "add_webhook",
  showBackButton = true,
}: WebhookFormHeaderProps) {
  const { t } = useLocale();

  return (
    <AppHeader>
      <div className="flex min-w-0 items-start gap-3">
        {showBackButton && (
          <Button
            aria-label={t("go_back")}
            render={<Link href="/settings/developer/webhooks" />}
            size="icon-sm"
            variant="ghost">
            <ArrowLeftIcon />
          </Button>
        )}
        <AppHeaderContent title={t(titleKey)}>
          <AppHeaderDescription>{t("add_webhook_description", { appName: APP_NAME })}</AppHeaderDescription>
        </AppHeaderContent>
      </div>
      {CTA && <AppHeaderActions>{CTA}</AppHeaderActions>}
    </AppHeader>
  );
}
