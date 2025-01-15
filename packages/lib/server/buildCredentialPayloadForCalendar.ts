import { isDwdCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";

export function buildCredentialPayloadForPrisma({
  credentialId,
  domainWideDelegationCredentialId,
}: {
  credentialId: number | null | undefined;
  domainWideDelegationCredentialId: string | null | undefined;
}) {
  if (credentialId === undefined) {
    return {
      credentialId,
      domainWideDelegationCredentialId,
    };
  }

  if (isDwdCredential({ credentialId })) {
    return {
      credentialId: null,
      domainWideDelegationCredentialId,
    };
  } else {
    return {
      credentialId,
      domainWideDelegationCredentialId: null,
    };
  }
}
