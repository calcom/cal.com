import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils.server";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { getSerializableForm } from "../../lib/getSerializableForm";
import type { TCalidFormQueryInputSchema } from "./formQuery.schema";

interface calIdFormsHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalidFormQueryInputSchema;
}

export const calidFormQueryHandler = async ({ ctx, input }: calIdFormsHandlerOptions) => {
  const { prisma, user } = ctx;
  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      AND: [
        entityPrismaWhereClause({ userId: user.id }),
        {
          id: input.id,
        },
      ],
    },
    include: {
      calIdTeam: { select: { slug: true, name: true } },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  if (!form) {
    return null;
  }

  return await getSerializableForm({ form });
};

export default calidFormQueryHandler;
