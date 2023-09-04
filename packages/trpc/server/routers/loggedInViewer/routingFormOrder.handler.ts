import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TRoutingFormOrderInputSchema } from "./routingFormOrder.schema";

type RoutingFormOrderOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoutingFormOrderInputSchema;
};

export const routingFormOrderHandler = async ({ ctx, input }: RoutingFormOrderOptions) => {
  const { user } = ctx;

  const forms = await prisma.app_RoutingForms_Form.findMany({
    where: {
      OR: [
        {
          userId: user.id,
        },
        {
          team: {
            members: {
              some: {
                userId: user.id,
                accepted: true,
              },
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      team: {
        include: {
          members: true,
        },
      },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  const allFormIds = new Set(forms.map((form) => form.id));
  if (input.ids.some((id) => !allFormIds.has(id))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  await Promise.all(
    input.ids.reverse().map((id, position) => {
      return prisma.app_RoutingForms_Form.update({
        where: {
          id: id,
        },
        data: {
          position,
        },
      });
    })
  );
};
