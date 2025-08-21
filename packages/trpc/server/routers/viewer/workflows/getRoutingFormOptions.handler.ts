import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TGetRoutingFormOptionsInputSchema } from "./getRoutingFormOptions.schema";

type GetRoutingFormOptionsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetRoutingFormOptionsInputSchema;
};

type Option = {
  value: string;
  label: string;
};

export const getRoutingFormOptionsHandler = async ({ ctx, input }: GetRoutingFormOptionsOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `workflows:getRoutingFormOptions.handler:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = ctx.user;
  const teamId = input?.teamId;

  // Get routing forms that the user has access to
  let routingForms;

  if (teamId) {
    // For team workflows: show forms from that specific team
    routingForms = await ctx.prisma.app_RoutingForms_Form.findMany({
      where: {
        teamId: teamId,
        team: {
          members: {
            some: {
              userId: user.id,
              accepted: true,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        disabled: true,
      },
      orderBy: [
        {
          name: "asc",
        },
      ],
    });
  } else {
    // For user workflows: show only personal forms (not team forms)
    routingForms = await ctx.prisma.app_RoutingForms_Form.findMany({
      where: {
        userId: user.id,
        teamId: null, // Only personal forms, not team forms
      },
      select: {
        id: true,
        name: true,
        disabled: true,
      },
      orderBy: [
        {
          name: "asc",
        },
      ],
    });
  }

  const routingFormOptions: Option[] = routingForms
    .filter((form) => !form.disabled)
    .map((form) => ({
      value: form.id,
      label: form.name,
    }));

  return {
    routingFormOptions,
  };
};
