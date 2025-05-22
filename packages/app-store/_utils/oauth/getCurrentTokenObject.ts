import logger from "@calcom/lib/logger";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { getTokenObjectFromCredential } from "./getTokenObjectFromCredential";

const log = logger.getSubLogger({
  prefix: ["getCurrentTokenObject"],
});

function buildDummyTokenObjectForDelegationUserCredential() {
  return {
    access_token: "TOKEN_PLACEHOLDER_FOR_DELEGATION_CREDENTIAL",
  };
}

export async function getCurrentTokenObject(
  credential: Pick<CredentialForCalendarService, "key" | "id" | "delegatedToId" | "userId">
) {
  let inDbCredential;
  if (credential.delegatedToId) {
    if (!credential.userId) {
      log.error("DelegationCredential: No user id found for delegation credential");
    } else {
      log.debug("Getting current token object for delegation credential");
      const delegationUserCredentialInDb =
        await CredentialRepository.findUniqueByUserIdAndDelegationCredentialId({
          userId: credential.userId,
          delegationCredentialId: credential.delegatedToId,
        });
      inDbCredential = delegationUserCredentialInDb;
      if (!inDbCredential) {
        log.error("getCurrentTokenObject: No delegation user credential found in db");
        // We return a dummy token object. OAuthManager requires a token object that must have access_token.
        // OAuthManager will help fetching new token object and then that would be stored in DB.
        return buildDummyTokenObjectForDelegationUserCredential();
      }
    }
  } else {
    log.debug("Getting current token object for non delegation credential");
    inDbCredential = credential;
  }
  if (!inDbCredential) {
    throw new Error("getCurrentTokenObject: No delegation user credential found in db");
  }
  const currentTokenObject = getTokenObjectFromCredential(inDbCredential);
  return currentTokenObject;
}
