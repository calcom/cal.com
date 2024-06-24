import type { Credential } from "@prisma/client";
import { createContext, useContext, useState, useEffect } from "react";

import { trpc } from "@calcom/trpc";

import type { AppKeysForm } from "../zod";
import { appKeysFormSchema } from "../zod";

const AuditLogCredentialContext = createContext<{
  appKey: AppKeysForm;
  data: Credential | undefined;
  isLoading: boolean;
  credentialId: number;
}>({
  appKey: {
    projectId: "",
    endpoint: "",
    apiKey: "",
  },
  data: undefined,
  isLoading: false,
  credentialId: 0,
});

export const AuditLogCredentialProvider = ({
  credentialId,
  children,
}: {
  credentialId: number;
  children: React.ReactNode;
}) => {
  const { data, isLoading } = trpc.viewer.appCredentialById.useQuery({
    id: credentialId,
  });

  const [appKey, setAppKey] = useState<AppKeysForm>({
    projectId: "Loading...",
    endpoint: "Loading...",
    apiKey: "Loading...",
  });

  useEffect(() => {
    if (isLoading === false && data) {
      const parsedData = appKeysFormSchema.safeParse(data.key);
      if (parsedData.success) {
        setAppKey({
          projectId: parsedData.data.projectId,
          endpoint: parsedData.data.endpoint,
          apiKey: parsedData.data.apiKey,
        });
      }
    }
  }, [isLoading, data]);

  return (
    <AuditLogCredentialContext.Provider
      value={{
        data,
        appKey,
        isLoading,
        credentialId,
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
