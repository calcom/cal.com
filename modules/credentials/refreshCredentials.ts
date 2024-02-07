import type { CredentialPayload } from "@calcom/types/Credential";
import { refreshCredential } from "./refreshCredential";
import async from "async";

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