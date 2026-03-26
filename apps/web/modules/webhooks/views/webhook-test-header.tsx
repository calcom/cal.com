"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
} from "@coss/ui/components/card";
import type { ReactNode } from "react";

export function WebhookTestHeader({ actions }: { actions?: ReactNode }) {
  const { t } = useLocale();

  return (
    <CardFrameHeader>
      <div className="flex items-center justify-between gap-4">
        <div>
          <CardFrameTitle>{t("webhook_test")}</CardFrameTitle>
          <CardFrameDescription>{t("test_webhook")}</CardFrameDescription>
        </div>
        {actions}
      </div>
    </CardFrameHeader>
  );
}
