import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetRoundRobinHostsToReassignInputSchema } from "./getRoundRobinHostsToReasign.schema";

type GetRoundRobinHostsToReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetRoundRobinHostsToReassignInputSchema;
};

export const getRoundRobinHostsToReassign = async ({ ctx, input }: GetRoundRobinHostsToReassignOptions) => {
  const { prisma } = ctx;
  const { isOrgAdmin } = ctx.user.organization;
  const hasPermsToView = !ctx.user.organization.isPrivate || isOrgAdmin;

  if (!hasPermsToView) {
    return [];
  }

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: input.bookingId },
    select: {
      eventTypeId: true,
    },
  });

  // If input.exclude is "fixedHosts", exclude fixed hosts from the list
  const excludeFixedHosts = input.exclude === "fixedHosts";

  const eventTypeHosts = await prisma.host.findMany({
    where: {
      eventTypeId: booking.eventTypeId,
      isFixed: excludeFixedHosts ? false : undefined,
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const hosts = eventTypeHosts.map((host) => host.user);

  return hosts;
};

export default getRoundRobinHostsToReassign;
