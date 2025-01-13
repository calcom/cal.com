import { isDomainWideDelegationCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";

export function buildCredentialPayloadForCalendar({
  credentialId,
  domainWideDelegationCredentialId,
}: {
  credentialId: number | null;
  domainWideDelegationCredentialId: string | null;
}) {
  // Only one of credentialId and domainWideDelegationCredentialId can be set at a time.
  // Set the other one as null because we want to ensure both credentialId and domainWideDelegationCredentialId are not active at the same time
  return {
    ...(!isDomainWideDelegationCredential({ credentialId })
      ? {
          credentialId,
          domainWideDelegationCredentialId: null,
        }
      : {
          domainWideDelegationCredentialId,
          credentialId: null,
        }),
  };
}
