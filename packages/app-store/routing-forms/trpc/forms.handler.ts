import type { PrismaClient } from "@prisma/client";

import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getSerializableForm } from "../lib/getSerializableForm";

interface FormsHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
}

export const formsHandler = async ({ ctx }: FormsHandlerOptions) => {
  const { prisma, user } = ctx;
  const forms = await prisma.app_RoutingForms_Form.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  const serializableForms = [];
  for (let i = 0; i < forms.length; i++) {
    serializableForms.push(await getSerializableForm(forms[i]));
  }
  return serializableForms;
};
