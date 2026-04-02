import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type z from "zod";
import type { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "./universalSchema";

const log = logger.getSubLogger({ prefix: ["_utils", "oauth", "updateTokenObject"] });
/**
 * @deprecated Use updateTokenObjectInDb instead
 */
export const updateTokenObject = async ({
  tokenObject,
  credentialId,
}: {
  tokenObject: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>;
  credentialId: number;
}) => {
  await prisma.credential.update({
    where: {
      id: credentialId,
    },
    data: {
      key: tokenObject as unknown as Prisma.InputJsonValue,
    },
  });
};

/**
 * OAuthManager helper to update the token object in db.
 *
 * It ensures that the token goes in DB. For JWT flow, it also creates a delegation user credential if not present
 */
export const updateTokenObjectInDb = async (
  args: {
    tokenObject: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>;
  } & (
    | {
        authStrategy: "jwt";
        userId: number | null;
        credentialType: string;
        appId: string;
        delegatedToId: string | null;
      }
    | {
        authStrategy: "oauth";
        credentialId: number;
      }
  )
) => {
  const { tokenObject } = args;
  if (args.authStrategy === "jwt") {
    const { userId, delegatedToId, credentialType, appId } = args;
    if (!userId) {
      log.error("Cannot update token object in DB for Delegation as userId is not present");
      return;
    }
    if (!delegatedToId) {
      log.error("Cannot update token object in DB for Delegation as delegatedToId is not present");
      return;
    }

    const updated = await CredentialRepository.updateWhereUserIdAndDelegationCredentialId({
      userId,
      delegationCredentialId: delegatedToId,
      data: {
        key: tokenObject as Prisma.InputJsonValue,
      },
    });

    // If no delegation-credential is updated, create one
    if (updated.count === 0) {
      log.debug("No delegation-credential found. Creating one");
      await CredentialRepository.createDelegationCredential({
        userId,
        delegationCredentialId: delegatedToId,
        type: credentialType,
        key: tokenObject as Prisma.InputJsonValue,
        appId,
      });
    }
  } else {
    const { credentialId } = args;
    await CredentialRepository.updateWhereId({
      id: credentialId,
      data: {
        key: tokenObject as Prisma.InputJsonValue,
      },
    });
  }
};
