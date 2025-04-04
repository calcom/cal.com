import { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TEventInputSchema } from "./getPublicEvent.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventInputSchema;
};

export const getPublicEventHandler = async ({ ctx, input }: GetOptions) => {
  return await getPublicEvent(
    input.username,
    input.eventSlug,
    input.isTeamEvent,
    input.org,
    ctx.prisma,
    input.fromRedirectOfNonOrgLink,
    ctx.user.id
  );
};
