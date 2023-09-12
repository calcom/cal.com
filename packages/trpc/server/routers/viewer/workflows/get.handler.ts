import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TGetInputSchema } from "./get.schema";
import { isAuthorized } from "./util";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      name: true,
      userId: true,
      teamId: true,
      team: {
        select: {
          id: true,
          slug: true,
          members: true,
          name: true,
        },
      },
      time: true,
      timeUnit: true,
      activeOn: {
        select: {
          eventType: true,
        },
      },
      trigger: true,
      steps: {
        orderBy: {
          stepNumber: "asc",
        },
      },
    },
  });

  const isUserAuthorized = await isAuthorized(workflow, prisma, ctx.user.id);

  if (!isUserAuthorized) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  return workflow;
};
