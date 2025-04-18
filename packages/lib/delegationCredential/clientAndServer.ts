export function isInMemoryDelegationCredential({
  credentialId,
}: {
  credentialId: number | null | undefined;
}) {
  // Though it is set as -1 right now, but we might want to set it to some other negative value.
  return typeof credentialId === "number" && credentialId < 0;
}

// Backward compatibility with platform code till it is changed
export const isDelegationCredential = isInMemoryDelegationCredential;

/**
 * It returns true if the credential is a delegation user credential from db.
 * That is it has credential.delegatedTo
 */
export function isDelegationUserCredentialFromDb({
  credential,
}: {
  credential: CredentialForCalendarService;
}) {
  console.log("isDelegationUserCredentialFromDb", credential);
  return !isDelegationCredential({ credentialId: credential.id }) && credential.delegationCredentialId;
}

export const buildNonDelegationCredential = <T extends Record<string, unknown> | null>(credential: T) => {
  type WithDelegationCredential = T extends null
    ? null
    : T & {
        delegatedTo: null;
        delegatedToId: null;
      };

  if (!credential) return null as WithDelegationCredential;
  return {
    ...credential,
    delegatedTo: null,
    delegatedToId: null,
  } as WithDelegationCredential;
};

export const buildNonDelegationCredentials = <T extends Record<string, unknown>>(credentials: T[]) => {
  const nonDelegationCredentials = credentials.filter((credential) => !credential.delegationCredentialId);
  return nonDelegationCredentials.map(buildNonDelegationCredential) as (T & {
    delegatedTo: null;
    delegatedToId: null;
  })[];
};
