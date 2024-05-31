import { createContext, useContext } from "react";

import { trpc } from "@calcom/trpc";

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
  const { data, isLoading } = trpc.viewer.appCredentialById.useQuery({
    id: credentialId,
  });
  return (
    <AuditLogCredentialContext.Provider value={{ data, isLoading }}>
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
