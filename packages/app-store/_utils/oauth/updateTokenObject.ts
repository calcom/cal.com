import type z from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

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
      key: tokenObject,
    },
  });
};

export const updateTokenObjectInDb = async (
  args: {
    tokenObject: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>;
  } & (
    | {
        authStrategy: "jwt";
        userId: number | null;
        credentialType: string;
        delegatedToId: string | null;
      }
    | {
        authStrategy: "oauth";
        credentialId: number;
      }
  )
) => {
  const { tokenObject, ...rest } = args;
  log.debug(
    "Updating token object in DB",
    safeStringify({
      ...rest,
    })
  );
  if (args.authStrategy === "jwt") {
    const { userId, delegatedToId, credentialType } = args;
    if (!userId) {
      log.error("Cannot update token object in DB for Delegation as userId is not present");
      return;
    }
    if (!delegatedToId) {
      log.error("Cannot update token object in DB for Delegation as delegatedToId is not present");
      return;
    }
    const updated = await prisma.credential.updateMany({
      where: {
        userId: userId,
        delegationCredentialId: delegatedToId,
      },
      data: {
        key: tokenObject,
      },
    });
    // If no delegation-credential is found, create one
    if (updated.count === 0) {
      log.debug("No delegation-credential found. Creating one");
      await prisma.credential.create({
        data: {
          userId,
          delegationCredentialId: delegatedToId,
          type: credentialType,
          key: tokenObject,
        },
      });
    }
  } else {
    const { credentialId } = args;
    await prisma.credential.update({
      where: {
        id: credentialId,
      },
      data: {
        key: tokenObject,
      },
    });
  }
};
