import type { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "_utils/oauth/universalSchema";
import type z from "zod";

import prisma from "@calcom/prisma";

export const updateDelegationCredentialTokenObject = async ({
  delegationCredentialId,
  tokenObject,
}: {
  delegationCredentialId: string;
  tokenObject: z.infer<typeof OAuth2UniversalSchemaWithCalcomBackwardCompatibility>;
}): Promise<void> => {
  const existingToken = await prisma.delegationCredentialAccesssToken.findFirst({
    where: {
      delegationCredentialId,
    },
  });

  if (existingToken) {
    await prisma.delegationCredentialAccesssToken.update({
      where: { id: existingToken.id },
      data: { key: tokenObject },
    });
  } else {
    await prisma.delegationCredentialAccesssToken.create({
      data: {
        key: tokenObject,
        delegationCredentialId,
      },
    });
  }
};
