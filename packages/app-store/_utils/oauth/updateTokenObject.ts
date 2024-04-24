import type z from "zod";

import prisma from "@calcom/prisma";

import type { OAuth2UniversalSchemaWithCalcomBackwardCompatibility } from "./universalSchema";

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
