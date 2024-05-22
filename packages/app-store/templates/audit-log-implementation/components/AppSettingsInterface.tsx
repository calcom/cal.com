import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import { availableTriggerTargets } from "@calcom/features/audit-logs/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AuditLogTriggerTargets } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import { appKeysSchema } from "../zod";
import { AuditLogEventToggles } from "./AuditLogEventToggles";
import { AuditSystemStatus } from "./AuditSystemStatus";
import { CredentialsForm } from "./CredentialsForm";
import { NavigationPanel } from "./NavigationPanel";

export default function AppSettings(props: { credentialId: number }) {
  const searchParams = useSearchParams();
  const logs = searchParams.get(props.credentialId.toString());
  const { t } = useLocale();
  const { data, isLoading } = trpc.viewer.appCredentialById.useQuery({
    id: props.credentialId,
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
      <div className="items-between flex space-x-4">
        <div className="flex w-[25%] flex-col space-y-4">
          <AuditSystemStatus credentialId={props.credentialId} />
          <NavigationPanel credentialId={props.credentialId} />
        </div>
        {logs ? (
          <AuditLogEventToggles
            credentialId={props.credentialId}
            settings={data?.settings as { empty: boolean; disabledEvents: string[] }}
            value={value}
            onChange={onChange}
          />
        ) : (
          <CredentialsForm
            form={form}
            updateAppCredentialsMutation={updateAppCredentialsMutation.mutate}
            credentialId={props.credentialId}
          />
        )}
      </div>
    </div>
  );
}
