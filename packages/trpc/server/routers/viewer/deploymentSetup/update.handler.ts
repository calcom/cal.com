import { symmetricEncrypt } from "@calcom/lib/crypto";
import { prisma } from "@calcom/prisma";

import type { TUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: Record<string, unknown>;
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ input }: UpdateOptions) => {
  const data: any = {
    agreedLicenseAt: new Date(),
    licenseKey: input.licenseKey,
  };

  // Encrypt and store the signature token if provided
  if (input.signatureToken) {
    const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("CALENDSO_ENCRYPTION_KEY is required to encrypt signature token");
    }
    data.signatureTokenEncrypted = symmetricEncrypt(input.signatureToken, encryptionKey);
  }

  await prisma.deployment.upsert({ where: { id: 1 }, create: data, update: data });

  return;
};
