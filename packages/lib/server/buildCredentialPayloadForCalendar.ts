import { isDomainWideDelegationCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";

export function buildCredentialPayloadForCalendar({
  credentialId,
  domainWideDelegationCredentialId,
}: {
  credentialId: number | null;
  domainWideDelegationCredentialId: string | null;
}) {
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
