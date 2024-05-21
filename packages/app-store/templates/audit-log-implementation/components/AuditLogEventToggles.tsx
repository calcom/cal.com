import { useState } from "react";

import { availableTriggerEvents, availableTriggerTargets } from "@calcom/features/audit-logs/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AuditLogTriggerTargets } from "@calcom/prisma/enums";
import { Badge, Switch, Select, Button } from "@calcom/ui";

import ManagedAuditLogEventDialog from "./ManagedAuditLogEventDialog";

export const AuditLogEventToggles = ({
  value,
  onChange,
}: {
  value: { label: string; value: AuditLogTriggerTargets; key: string };
  onChange(key: string | undefined): void;
}) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const { t } = useLocale();
  const { t: tAuditLogs } = useLocale("audit-logs");

  function handleUpdate(checked: boolean, action: string) {
    setLoading(true);
    setOpen(true);
    console.log({ checked, action });
  }

  function handleOpenChange() {
    setOpen((isOpen) => !isOpen);
  }

  return (
    <div className="flex w-[80%] flex-col justify-between space-y-4">
      <ManagedAuditLogEventDialog
        isPending={false}
        actionKey="BOOKING_RESCHEDULED"
        onOpenChange={handleOpenChange}
        onConfirm={() => console.log("heyyyy")}
        isOpen={isOpen}
      />
      <div className="grid h-[100%] w-[100%]">
        <Select<{ label: string; value: AuditLogTriggerTargets; key: string }>
          className="capitalize"
          options={Object.values(availableTriggerTargets)}
          value={value}
          onChange={(e) => onChange(e?.key)}
        />

        <ul className="border-subtle divide-subtle my-4 h-[350px] divide-y overflow-scroll rounded-md border">
          {Object.values(availableTriggerEvents[value.key]).map((action, key) => (
            <li key={key} className="hover:bg-muted group relative flex items-center  justify-between p-4 ">
              <div>
                <div className="flex flex-col lg:flex-row lg:items-center">
                  <div className="text-default text-sm font-semibold ltr:mr-2 rtl:ml-2">
                    <span>{tAuditLogs(`events.${action}.title`)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="grayWithoutHover" data-testid={true ? "required" : "optional"}>
                      {t("optional")}
                    </Badge>
                  </div>
                </div>
                <p className="text-subtle max-w-[280px] break-words pt-1 text-sm sm:max-w-[500px]">
                  {tAuditLogs(`events.${action}.description`)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  disabled={loading}
                  checked={true}
                  onCheckedChange={(checked) => {
                    handleUpdate(checked, action as string);
                  }}
                  classNames={{ container: "p-2 hover:bg-subtle rounded" }}
                  tooltip={
                    true ? tAuditLogs(`tooltipInformationEnabled`) : tAuditLogs(`tooltipInformationDisabled`)
                  }
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="text-right">
          <Button size="base">{t("submit")}</Button>
        </div>
      </div>
    </div>
  );
};
