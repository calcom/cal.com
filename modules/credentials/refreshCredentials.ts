import type { CredentialPayload } from "@calcom/types/Credential";
import { refreshCredential } from "./refreshCredential";
import async from "async";

export async function refreshCredentials(credentials: Array<CredentialPayload>): Promise<Array<CredentialPayload>> {
    return await async.mapLimit(credentials, 5, refreshCredential);
  }
  