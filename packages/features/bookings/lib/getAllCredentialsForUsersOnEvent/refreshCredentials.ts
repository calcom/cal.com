import async from "async";

import type { CredentialPayload } from "@calcom/types/Credential";

import { refreshCredential } from "./refreshCredential";

/**
 * Refreshes the given set of credentials.
 *
 * @param credentials
 */
export async function refreshCredentials(
  credentials: Array<CredentialPayload>
): Promise<Array<CredentialPayload>> {
  return await async.mapLimit(credentials, 5, refreshCredential);
}
