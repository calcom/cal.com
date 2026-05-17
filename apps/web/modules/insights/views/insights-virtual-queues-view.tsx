"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export default function InsightsVirtualQueuesPage() {
  const { t } = useLocale();
  return (
    <EmptyScreen
      Icon="split"
      headline={t("no_routing_forms")}
      description={t("empty_routing_forms_description")}
    />
  );
}
