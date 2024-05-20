import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { InputShell } from "@calcom/app-store/templates/audit-log-implementation/components/InputShell";
import { NavigationPanel } from "@calcom/app-store/templates/audit-log-implementation/components/NavigationPanel";
import { availableTriggerTargets } from "@calcom/features/audit-logs/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AuditLogTriggerTargets } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { Form, PasswordField, showToast, InputField, Label } from "@calcom/ui";

import { appKeysSchema } from "../zod";

export default function AppSettings(props: { credentialId: string }) {
  const { t } = useLocale();
  const { t: tAuditLogs } = useLocale("audit-logs");
  const { data, isLoading } = trpc.viewer.appCredentialById.useQuery({
    id: parseInt(props.credentialId),
  });
  const [value, setValue] = useState<{ label: string; value: AuditLogTriggerTargets; key: string }>(
    availableTriggerTargets.booking
  );

  const form = useForm<{
    apiKey: string;
    projectId: string;
    endpoint: string;
  }>({
    resolver: zodResolver(appKeysSchema),
  });

  useEffect(() => {
    if (isLoading === false && data && data.credential && data.credential.key) {
      form.reset({
        apiKey: data.credential.key.apiKey,
        projectId: data.credential.key.projectId,
        endpoint: data.credential.key.endpoint,
      });
    }
  }, [isLoading]);

  // function onChanges(key: string | undefined) {
  //   if (key) {
  //     const index = Object.keys(availableTriggerTargets).indexOf(key);
  //     setValue(Object.values(availableTriggerTargets)[index]);
  //   } else {
  //     setValue(Object.values(availableTriggerTargets)[0]);
  //   }
  // }

  const updateAppCredentialsMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      form.reset(form.getValues());
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <div className="align-right space-y-4 px-4 pb-4 pt-4 text-sm">
      <Form
        form={form}
        className="grid grid-cols-5 grid-rows-3 gap-4"
        handleSubmit={async (values) => {
          try {
            updateAppCredentialsMutation.mutate({
              credentialId: 1,
              key: values,
            });
          } catch (e) {
            console.log(e);
          }
        }}>
        <Controller
          name="projectId"
          control={form.control}
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <div className="col-span-4 col-start-2 row-start-1 flex flex-row items-end space-x-5">
              <InputShell isDirty={fieldState.isDirty}>
                <InputField
                  required
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  name="Endpoint"
                  className="mb-1"
                  data-dirty={fieldState.isDirty}
                  containerClassName="w-[100%] data-[dirty=true]:w-[90%] duration-300"
                />
              </InputShell>
            </div>
          )}
        />
        <Controller
          name="endpoint"
          control={form.control}
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <div className="col-span-4 col-start-2 row-start-2 flex flex-row items-end space-x-5">
              <InputShell isDirty={fieldState.isDirty}>
                <InputField
                  required
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  name="Project ID"
                  className="mb-1"
                  data-dirty={fieldState.isDirty}
                  containerClassName="w-[100%] data-[dirty=true]:w-[90%] duration-300"
                />
              </InputShell>
            </div>
          )}
        />
        <Controller
          name="apiKey"
          control={form.control}
          render={({ field: { onBlur, onChange, value }, fieldState }) => (
            <div className="col-span-4 col-start-2 row-start-3 flex flex-row items-end space-x-5">
              <InputShell isDirty={fieldState.isDirty}>
                <PasswordField
                  onChange={onChange}
                  onBlur={onBlur}
                  name="API Key"
                  value={value}
                  className="mb-0"
                  containerClassName="w-[100%] data-[dirty=true]:w-[90%] duration-300"
                />
              </InputShell>
            </div>
          )}
        />
        <div className="mb-1 grid grid-cols-3 overflow-hidden rounded-md border">
          <div className="flex flex-row items-center justify-center border-r-[1px]">
            <span className="relative flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-700 opacity-75" />
              <span className="relative inline-flex h-5 w-5 rounded-full bg-lime-600" />
            </span>
          </div>
          <div className="col-span-2 flex w-[100%] flex-col items-center justify-center">
            <Label className="mb-0 text-[11px]">System Operational</Label>
            <p className="text-[8px]">{new Date().toLocaleString()}</p>
          </div>
        </div>
        <div className="row-span-2 rounded-md border">
          <NavigationPanel />
        </div>
      </Form>

      {/* <Select<{ label: string; value: AuditLogTriggerTargets; key: string }>
        className="capitalize"
        options={Object.values(availableTriggerTargets)}
        value={value}
        onChange={(e) => onChange(e?.key)}
      />

      <ul className="border-subtle divide-subtle mt-4 divide-y rounded-md border">
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
                disabled={false}
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
      <Button size="base">{t("submit")}</Button> */}
    </div>
  );
}
