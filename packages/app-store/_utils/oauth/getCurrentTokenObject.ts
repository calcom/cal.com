import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { getTokenObjectFromCredential } from "./getTokenObjectFromCredential";

const log = logger.getSubLogger({
  prefix: ["getCurrentTokenObject"],
});

async function getDelegationUserCredentialInDb({
  userId,
  delegationCredentialId,
}: {
  userId: number;
  delegationCredentialId: string;
}) {
  const delegationUserCredentialInDb = await prisma.credential.findFirst({
    where: {
      userId,
      delegationCredentialId,
    },
  });
  return delegationUserCredentialInDb;
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
      const delegationUserCredentialInDb = await getDelegationUserCredentialInDb({
        userId: credential.userId,
        delegationCredentialId: credential.delegatedToId,
      });
      inDbCredential = delegationUserCredentialInDb;
      if (!inDbCredential) {
        log.error("getCurrentTokenObject: No delegation user credential found in db");
        return {
          access_token: "TOKEN_PLACEHOLDER_FOR_DELEGATION_CREDENTIAL",
        };
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
