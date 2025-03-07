export function isDelegationCredential({ credentialId }: { credentialId: number | null | undefined }) {
  // Though it is set as -1 right now, but we might want to set it to some other negative value.
  return typeof credentialId === "number" && credentialId < 0;
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
  return credentials.map(buildNonDelegationCredential).filter((credential) => !!credential) as (T & {
    delegatedTo: null;
    delegatedToId: null;
  })[];
};
