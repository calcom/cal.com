export function isDomainWideDelegationCredential({ credentialId }: { credentialId?: number }) {
  // Though it is set as -1 right now, but we might want to set it to some other negative value.
  return !!credentialId && credentialId < 0;
}
