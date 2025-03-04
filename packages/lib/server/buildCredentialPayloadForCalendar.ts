import { isDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";

export function buildCredentialPayloadForPrisma({
  credentialId,
  delegationCredentialId,
}: {
  credentialId: number | null | undefined;
  delegationCredentialId: string | null | undefined;
}) {
  if (credentialId === undefined) {
    return {
      credentialId,
      delegationCredentialId,
    };
  }

  if (isDelegationCredential({ credentialId })) {
    return {
      credentialId: null,
      delegationCredentialId,
    };
  } else {
    return {
      credentialId,
      delegationCredentialId: null,
    };
  }
}
