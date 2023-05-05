import { prisma } from "@calcom/prisma";

import type { TUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: Record<string, unknown>;
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ input }: UpdateOptions) => {
  const data = {
    agreedLicenseAt: new Date(),
    licenseKey: input.licenseKey,
  };

  await prisma.deployment.upsert({ where: { id: 1 }, create: data, update: data });

  return;
};
