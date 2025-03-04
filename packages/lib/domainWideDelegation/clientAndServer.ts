export function isDwdCredential({ credentialId }: { credentialId: number | null | undefined }) {
  // Though it is set as -1 right now, but we might want to set it to some other negative value.
  return typeof credentialId === "number" && credentialId < 0;
}

export const buildNonDwdCredential = <T extends Record<string, unknown> | null>(credential: T) => {
  type WithDelegatedCredential = T extends null
    ? null
    : T & {
        delegatedTo: null;
        delegatedToId: null;
      };

  if (!credential) return null as WithDelegatedCredential;
  return {
    ...credential,
    delegatedTo: null,
    delegatedToId: null,
  } as WithDelegatedCredential;
};

export const buildNonDwdCredentials = <T extends Record<string, unknown>>(credentials: T[]) => {
  return credentials.map(buildNonDwdCredential).filter((credential) => !!credential) as (T & {
    delegatedTo: null;
    delegatedToId: null;
  })[];
};
