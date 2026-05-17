"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export default function InsightsCallHistoryView() {
  const { t } = useLocale();
  return (
    <div className="py-8">
      <EmptyScreen
        Icon="phone"
        headline={t("coming_soon")}
        description={t("feature_not_available_on_this_plan")}
      />
    </div>
  );
}
