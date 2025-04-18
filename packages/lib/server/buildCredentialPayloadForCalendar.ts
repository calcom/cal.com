export function buildCredentialPayloadForPrisma({
  credentialId,
  delegationCredentialId,
}: {
  credentialId: number | null | undefined;
  delegationCredentialId: string | null | undefined;
}) {
  return {
    credentialId,
    delegationCredentialId,
  };
}
