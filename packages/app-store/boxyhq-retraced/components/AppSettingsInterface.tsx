import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Badge, Button, InputField, PasswordField, Select, showToast, Switch } from "@calcom/ui";

type Action = {
  type: string;
  action: string;
  id: number;
  toggleEnabled: boolean;
};

const AvailableActions: Action[] = [
  {
    type: "events",
    action: "booked",
    id: 0,
    toggleEnabled: true,
  },
  {
    type: "events",
    action: "created",
    id: 0,
    toggleEnabled: true,
  },
  {
    type: "events",
    action: "rescheduled",
    id: 0,
    toggleEnabled: true,
  },
  {
    type: "events",
    action: "cancelled",
    id: 0,
    toggleEnabled: true,
  },
];

const availableOptions = {
  bookings: {
    label: "Bookings",
    value: "bookings",
  },
  teams: {
    label: "Teams",
    value: "teams",
  },
  apps: {
    label: "Apps",
    value: "apps",
  },
  routingforms: {
    label: "Routing Forms",
    value: "routing-forms",
  },
  workflows: {
    label: "Workflows",
    value: "workflows",
  },
  edit: {
    label: "Edit",
    value: "edit",
  },
  settings: {
    label: "Settings",
    value: "settings",
  },
  profile: {
    label: "Profile",
    value: "profile",
  },
  schedule: {
    label: "Schedule",
    value: "schedule",
  },
};

export default function AppSettings() {
  const { t } = useLocale();
  const { t: tAuditLogs } = useLocale("audit-logs");
  // const integrations = trpc.viewer.integrations.useQuery({ variant: "auditLog", appId: "audit-log-implementation" });
  const [projectId, setProjectId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [value, setValue] = useState<{ label: string; value: string } | undefined>(availableOptions.settings);
  const saveKeysMutation = trpc.viewer.appsRouter.saveKeys.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  function onChange(value: string | undefined) {
    if (value) {
      const index = Object.keys(availableOptions).indexOf(value);
      setValue(Object.values(availableOptions)[index]);
    } else {
      setValue(Object.values(availableOptions)[0]);
    }
  }

  return (
    <div className="align-right space-y-4 px-4 pb-4 pt-4 text-sm">
      <InputField
        required
        onChange={(e) => {
          setProjectId(e.target.value);
        }}
        value={projectId}
        disabled={false}
        name="Project ID"
      />
      <PasswordField
        placeholder=""
        value={apiKey}
        name="API Key"
        onChange={async (e) => {
          setApiKey(e.target.value);
        }}
      />
      <Button
        size="base"
        onClick={() => {
          console.log({ apiKey, projectId });
          saveKeysMutation.mutate({
            slug: "audit-log-implementation",
            dirName: "audit-log-implementation",
            type: "auditLogs",
            keys: {
              apiKey: apiKey,
              projectId: projectId,
            },
          });
        }}>
        {t("submit")}
      </Button>

      <Select<{ label: string; value: string }>
        className="capitalize"
        options={Object.values(availableOptions)}
        value={value}
        onChange={(e) => onChange(e?.value)}
      />

      <ul className="border-subtle divide-subtle mt-4 divide-y rounded-md border">
        {AvailableActions.map((action, key) => (
          <li key={key} className="hover:bg-muted group relative flex items-center  justify-between p-4 ">
            <div>
              <div className="flex flex-col lg:flex-row lg:items-center">
                <div className="text-default text-sm font-semibold ltr:mr-2 rtl:ml-2">
                  <span>{tAuditLogs(`${action.type}.${action.action}.title`)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="grayWithoutHover" data-testid={true ? "required" : "optional"}>
                    {action.toggleEnabled ? t("required") : t("optional")}
                  </Badge>
                </div>
              </div>
              <p className="text-subtle max-w-[280px] break-words pt-1 text-sm sm:max-w-[500px]">
                {tAuditLogs(`${action.type}.${action.action}.description`)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                disabled={action.toggleEnabled}
                checked={true}
                onCheckedChange={(checked) => {
                  console.log({ checked });
                  // update(index, { ...field, hidden: !checked });
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
      <Button size="base">{t("submit")}</Button>
    </div>
  );
}
