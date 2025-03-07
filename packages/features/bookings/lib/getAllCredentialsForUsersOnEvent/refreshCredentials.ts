import async from "async";

import { isDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
import { buildAllCredentials } from "@calcom/lib/delegationCredential/server";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { refreshCredential } from "./refreshCredential";

/**
 * Refreshes the given set of credentials.
 *
 * @param credentials
 */
export async function refreshCredentials(
  credentials: Array<CredentialForCalendarService>
): Promise<Array<CredentialForCalendarService>> {
  const nonDelegationCredentials = credentials.filter(
    (cred) => !isDelegationCredential({ credentialId: cred.id })
  );
  const delegationCredentials = credentials.filter((cred) =>
    isDelegationCredential({ credentialId: cred.id })
  );
  const refreshedDbCredentials = await async.mapLimit(nonDelegationCredentials, 5, refreshCredential);
  return buildAllCredentials({ delegationCredentials, existingCredentials: refreshedDbCredentials });
}
