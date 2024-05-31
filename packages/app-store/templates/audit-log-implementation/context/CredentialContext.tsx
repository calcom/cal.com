import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useState, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";

import { availableTriggerTargets } from "@calcom/features/audit-logs/constants";
import type { AuditLogTriggerTargets } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui";

import appConfig from "../config.json";
import { appKeysSchema } from "../zod";

const AuditLogCredentialContext = createContext<
  | {
      data:
        | {
            apiKey?: string;
            endpoint?: string;
            projectId?: string;
            settings?: any;
            isInvalid?: boolean | null;
          }
        | undefined;
      isLoading: boolean;
      value: { label: string; value: AuditLogTriggerTargets; key: string };
      onChange(key: string | undefined): void;
      credentialId: number;
      activePanel: string | null;
      form: UseFormReturn<
        {
          apiKey: string;
          projectId: string;
          endpoint: string;
        },
        any
      >;
      status:
        | {
            status: number;
            message: string;
            lastCheck: string;
          }
        | undefined;
      statusLoading: boolean;
    }
  | undefined
>(undefined);

export const AuditLogCredentialProvider = ({
  credentialId,
  children,
}: {
  credentialId: number;
  children: React.ReactNode;
}) => {
  const searchParams = useSearchParams();
  const activePanel = searchParams.get(credentialId.toString());
  const { data, isLoading } = trpc.viewer.appCredentialById.useQuery({
    id: credentialId,
  });

  const [value, setValue] = useState<{ label: string; value: AuditLogTriggerTargets; key: string }>(
    availableTriggerTargets.booking
  );

  function onChange(key: string | undefined) {
    if (key) {
      const index = Object.keys(availableTriggerTargets).indexOf(key);
      setValue(Object.values(availableTriggerTargets)[index]);
    } else {
      setValue(Object.values(availableTriggerTargets)[0]);
    }
  }

  const { data: checkStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ["ping", credentialId.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/${appConfig.slug}/ping`, {
        method: "post",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          credentialId,
        }),
      });

      if (response.status === 200) {
        showToast("Ping successful. Audit Logging integration is healthy.", "success");
      } else {
        showToast("Ping failed. Please ensure your credentials are valid.", "error");
      }

      return {
        status: response.status,
        message: response.statusText,
        lastCheck: new Date().toLocaleString(),
      };
    },
  });

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

  return (
    <AuditLogCredentialContext.Provider
      value={{
        data,
        value,
        onChange,
        isLoading,
        credentialId,
        activePanel,
        form,
        status: checkStatus,
        statusLoading: loadingStatus,
      }}>
      {children}
    </AuditLogCredentialContext.Provider>
  );
};

export function useAppCredential() {
  const credential = useContext(AuditLogCredentialContext);
  if (credential === undefined) {
    throw new Error(`useAppCredential must be used within an AuditLogCredentialProvider`);
  }
  return credential;
}
