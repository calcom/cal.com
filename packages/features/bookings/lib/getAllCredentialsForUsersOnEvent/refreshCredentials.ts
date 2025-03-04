import async from "async";

import { isDwdCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";
import { buildAllCredentials } from "@calcom/lib/domainWideDelegation/server";
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
  const nonDwdCredentials = credentials.filter((cred) => !isDwdCredential({ credentialId: cred.id }));
  const dwdCredentials = credentials.filter((cred) => isDwdCredential({ credentialId: cred.id }));
  const refreshedDbCredentials = await async.mapLimit(nonDwdCredentials, 5, refreshCredential);
  return buildAllCredentials({ dwdCredentials, existingCredentials: refreshedDbCredentials });
}
