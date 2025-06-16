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

const isInDbDelegationCredential = (credential: {
  id?: number | null;
  delegationCredentialId?: number | null;
}) => {
  if (!credential.id) return false;
  return (
    !!credential.delegationCredentialId && !isInMemoryDelegationCredential({ credentialId: credential.id })
  );
};

export const buildNonDelegationCredential = <T extends Record<string, unknown> | null>(credential: T) => {
  type WithDelegationCredential = T extends null
    ? null
    : T & {
        delegatedTo: null;
        delegatedToId: null;
        delegationCredentialId: null;
      };

  // We are building a non-delegation credential and thus a Delegation Credential mustn't be passed from here
  // In-Db Delegation User Credentials might right here.
  if (!credential || isInDbDelegationCredential(credential)) return null as WithDelegationCredential;
  return {
    ...credential,
    delegatedTo: null,
    delegatedToId: null,
    delegationCredentialId: null,
  } as WithDelegationCredential;
};

export const buildNonDelegationCredentials = <T extends Record<string, unknown>>(credentials: T[]) => {
  // There could be User Delegation Credentials in DB as well that would reach here, because they have credential.id > 0, we would absolutely not want to use them here because there would already be in-memory delegation credential that would be used instead.
  const nonDelegationCredentials = credentials.filter(
    (credential) => !isInDbDelegationCredential(credential)
  );
  return nonDelegationCredentials.map(buildNonDelegationCredential) as (T & {
    delegatedTo: null;
    delegatedToId: null;
  })[];
};
