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

  // Get all routing forms that the user has access to
  //todo: review this query
  const routingForms = await ctx.prisma.app_RoutingForms_Form.findMany({
    where: {
      OR: [
        // Forms owned by user
        {
          userId: user.id,
          teamId: teamId || null,
        },
        // Forms in teams where user is a member
        ...(teamId
          ? [
              {
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
            ]
          : [
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
            ]),
      ],
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
