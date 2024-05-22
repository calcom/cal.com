import { useState } from "react";

import { availableTriggerEvents, availableTriggerTargets } from "@calcom/features/audit-logs/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AuditLogTriggerTargets } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { Badge, Switch, Select } from "@calcom/ui";
import { showToast } from "@calcom/ui";

import ManagedAuditLogEventDialog from "./ManagedAuditLogEventDialog";

export const AuditLogEventToggles = ({
  value,
  onChange,
  credentialId,
  settings,
}: {
  value: { label: string; value: AuditLogTriggerTargets; key: string };
  onChange(key: string | undefined): void;
  settings: { empty: boolean; disabledEvents: string[] };
  credentialId: number;
}) => {
  const [isOpen, setOpen] = useState(false);
  const { t } = useLocale();
  const { t: tAuditLogs } = useLocale("audit-logs");
  const [actionKey, setActionKey] = useState({ checked: true, action: "" });

  const [disabledEvents, setDisabledEvents] = useState<Set<string>>(new Set(settings.disabledEvents));

  function handleUpdate(checked: boolean, action: string) {
    setOpen(true);
    setActionKey({ checked, action });
  }

  function handleOpenChange() {
    setOpen((isOpen) => !isOpen);
  }

  const updateCredentialSettingsMutation = trpc.viewer.appsRouter.updateCredentialSettings.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  async function handleOnConfirm() {
    updateCredentialSettingsMutation.mutate({
      credentialId: credentialId.toString(),
      settings: { toBeDisabled: !actionKey.checked, event: actionKey.action },
    });

    const newDisabledEvents = disabledEvents;
    if (!actionKey.checked) {
      newDisabledEvents.add(actionKey.action);
      setDisabledEvents(newDisabledEvents);
    } else {
      newDisabledEvents.delete(actionKey.action);
      setDisabledEvents(newDisabledEvents);
    }
  }

  return (
    <div className="flex w-[80%] flex-col justify-between space-y-4">
      <ManagedAuditLogEventDialog
        isPending={false}
        actionKey={actionKey}
        onOpenChange={() => handleOpenChange()}
        onConfirm={() => handleOnConfirm()}
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
                  checked={!disabledEvents.has(action)}
                  onCheckedChange={(checked) => {
                    handleUpdate(checked, action);
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
      </div>
    </div>
  );
};
