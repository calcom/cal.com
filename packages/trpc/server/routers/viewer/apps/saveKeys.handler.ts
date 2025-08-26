import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import type { PrismaClient } from "@calcom/prisma";

// import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TSaveKeysInputSchema } from "./saveKeys.schema";

type SaveKeysOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TSaveKeysInputSchema;
};

export const saveKeysHandler = async ({ ctx, input }: SaveKeysOptions) => {
  const keysSchema = appKeysSchemas[input.dirName as keyof typeof appKeysSchemas];
  const keys = keysSchema.parse(input.keys);

  // seed-app-store should always be run
  await ctx.prisma.app.update({
    where: {
      slug: input.slug,
    },
    data: { keys, ...(input.fromEnabled && { enabled: true }) },
  });
};
