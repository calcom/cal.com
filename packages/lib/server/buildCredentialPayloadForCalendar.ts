import { isDomainWideDelegationCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";

export function buildCredentialPayloadForCalendar({
  credentialId,
  domainWideDelegationCredentialId,
}: {
  credentialId: number | null;
  domainWideDelegationCredentialId: string | null;
}) {
  // Only one of credentialId and domainWideDelegationCredentialId can be set at a time.
  return {
    ...(!isDomainWideDelegationCredential({ credentialId })
      ? {
          credentialId,
          domainWideDelegationCredentialId: undefined,
        }
      : {
          domainWideDelegationCredentialId,
          credentialId: undefined,
        }),
  };
}
