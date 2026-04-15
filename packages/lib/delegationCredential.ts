export function isInMemoryDelegationCredential({
  credentialId,
}: {
  credentialId: number | null | undefined;
}) {
  // Though it is set as -1 right now, but we might want to set it to some other negative value.
  return typeof credentialId === "number" && credentialId < 0;
}

export const isDelegationCredential = isInMemoryDelegationCredential;

export const buildNonDelegationCredential = <T extends Record<string, unknown> | null>(credential: T) => {
  type WithDelegationCredential = T extends null
    ? null
    : T & {
        delegatedTo: null;
        delegatedToId: null;
        delegationCredentialId: null;
      };

  if (!credential) return null as WithDelegationCredential;
  return {
    ...credential,
    delegatedTo: null,
    delegatedToId: null,
    delegationCredentialId: null,
  } as WithDelegationCredential;
};

export const buildNonDelegationCredentials = <T extends Record<string, unknown>>(credentials: T[]) => {
  return credentials.map(buildNonDelegationCredential) as (T & {
    delegatedTo: null;
    delegatedToId: null;
  })[];
};
