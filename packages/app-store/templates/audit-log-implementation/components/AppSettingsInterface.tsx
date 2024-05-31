import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";

import { availableTriggerTargets } from "@calcom/features/audit-logs/constants";
import { DefaultAppSettingsOptions } from "@calcom/features/audit-logs/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AuditLogTriggerTargets } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import { useAppCredential, AuditLogCredentialProvider } from "../context/CredentialContext";
import type { CredentialSettings } from "../zod";
import { appKeysSchema } from "../zod";
import { AuditLogEventToggles } from "./AuditLogEventToggles";
import { AuditSystemStatus } from "./AuditSystemStatus";
import { CredentialsForm } from "./CredentialsForm";
import { GeneralSettings } from "./GeneralSettings";
import { NavigationPanel } from "./NavigationPanel";

export default function AppSettings(props: { credentialId: number }) {
  return (
    <AuditLogCredentialProvider credentialId={props.credentialId}>
      <Interface credentialId={props.credentialId} />
    </AuditLogCredentialProvider>
  );
}

function Interface(props: { credentialId: number }) {
  const searchParams = useSearchParams();
  const activePanel = searchParams.get(props.credentialId.toString());
  const { t } = useLocale();
  const { data, isLoading } = useAppCredential();

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
    if (isLoading === false && data) {
      form.reset({
        apiKey: data.apiKey as string,
        projectId: data.projectId as string,
        endpoint: data.endpoint as string,
      });
    }
  }, [isLoading]);

  function onChange(key: string | undefined) {
    if (key) {
      const index = Object.keys(availableTriggerTargets).indexOf(key);
      setValue(Object.values(availableTriggerTargets)[index]);
    } else {
      setValue(Object.values(availableTriggerTargets)[0]);
    }
  }

  const updateAppCredentialsMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      form.reset(form.getValues());
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (isLoading) return null;

  return (
    <div className="align-right space-y-4 px-4 pb-4 pt-4 text-sm">
      <AuditLogCredentialProvider credentialId={props.credentialId}>
        <div className="items-between flex space-x-4">
          <div className="flex w-[25%] flex-col space-y-4">
            <AuditSystemStatus credentialId={props.credentialId} />
            <NavigationPanel credentialId={props.credentialId} />
          </div>
          <div className="flex w-[80%] flex-col justify-between space-y-4">
            {renderPanel(
              activePanel,
              props.credentialId,
              data?.settings as CredentialSettings,
              value,
              onChange,
              form,
              updateAppCredentialsMutation
            )}
          </div>
        </div>
      </AuditLogCredentialProvider>
    </div>
  );
}

function renderPanel(
  activePanel: string | null,
  credentialId: number,
  settings: CredentialSettings,
  value: { label: string; value: AuditLogTriggerTargets; key: string },
  onChange: (key: string | undefined) => void,
  form: UseFormReturn<
    {
      apiKey: string;
      projectId: string;
      endpoint: string;
    },
    any
  >,
  updateAppCredentialsMutation: any
) {
  switch (activePanel) {
    case DefaultAppSettingsOptions.TRIGGERS: {
      return (
        <AuditLogEventToggles
          credentialId={credentialId}
          settings={settings}
          value={value}
          onChange={onChange}
        />
      );
    }

    case DefaultAppSettingsOptions.GENERAL: {
      return <GeneralSettings />;
    }

    // DefaultAppSettingsOptions.CREDENTIALS
    default:
      return (
        <CredentialsForm
          form={form}
          updateAppCredentialsMutation={updateAppCredentialsMutation.mutate}
          credentialId={credentialId}
        />
      );
  }
}
