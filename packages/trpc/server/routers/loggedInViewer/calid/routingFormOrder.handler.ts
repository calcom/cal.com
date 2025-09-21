import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdRoutingFormOrderInputSchema } from "./routingFormOrder.schema";

type CalIdRoutingFormOrderOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdRoutingFormOrderInputSchema;
};

export const calIdRoutingFormOrderHandler = async ({ ctx, input }: CalIdRoutingFormOrderOptions) => {
  const { user } = ctx;

  const forms = await prisma.app_RoutingForms_Form.findMany({
    where: {
      OR: [
        {
          userId: user.id,
        },
        {
          calIdTeam: {
            members: {
              some: {
                userId: user.id,
                acceptedInvitation: true,
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
      calIdTeam: {
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
