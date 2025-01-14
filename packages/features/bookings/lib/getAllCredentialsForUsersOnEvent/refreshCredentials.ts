import async from "async";

import { buildNonDwdCredentials } from "@calcom/lib/domainWideDelegation/server";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";

import { refreshCredential } from "./refreshCredential";

/**
 * Refreshes the given set of credentials.
 *
 * @param credentials
 */
export async function refreshCredentials(
  credentials: Array<CredentialPayload>
): Promise<Array<CredentialForCalendarService>> {
  const dbCredentials = await async.mapLimit(credentials, 5, refreshCredential);
  return buildNonDwdCredentials(dbCredentials);
}
