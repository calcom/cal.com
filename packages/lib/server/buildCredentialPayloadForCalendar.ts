export function buildCredentialPayloadForPrisma({
  credentialId,
  delegationCredentialId,
}: {
  credentialId: number | null | undefined;
  delegationCredentialId: string | null | undefined;
}) {
  if (credentialId && credentialId < 0) {
    // Avoid crashing the query by not passing negative credentialId
    return {
      credentialId: null,
      delegationCredentialId,
    };
  }
  // It is possible for both credentialId and delegationCredentialId to be present on a SelectedCalendar. So, we allow both to be
  // This is because a Delegation User Credential can also exist in DB(as created through credentials/cron.ts) and thus could have credentialId as well.
  return {
    credentialId,
    delegationCredentialId,
  };
}
