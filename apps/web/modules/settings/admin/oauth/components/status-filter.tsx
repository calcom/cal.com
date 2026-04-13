"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tabs, TabsList, TabsTab } from "@coss/ui/components/tabs";

import { STATUS_OPTIONS } from "../hooks/use-client-list-state";

export function StatusFilter({
  statusFilter,
  onStatusChange,
}: {
  statusFilter: string;
  onStatusChange: (status: string) => void;
}) {
  const { t } = useLocale();

  return (
    <Tabs
      value={statusFilter}
      onValueChange={(value) => {
        if (value) {
          onStatusChange(value);
        }
      }}>
      <TabsList className="rounded-lg bg-muted p-1">
        {STATUS_OPTIONS.map((tab) => (
          <TabsTab key={tab.value} value={tab.value} className="rounded-md">
            {t(tab.labelKey)}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
