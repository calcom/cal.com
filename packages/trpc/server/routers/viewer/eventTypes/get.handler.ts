import { NotFoundError } from "@calcom/lib/errors";
import getEventTypeById from "@calcom/lib/event-types/getEventTypeById";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetInputSchema;
};

export const getHandler = ({ ctx, input }: GetOptions) => {
  try {
    return getEventTypeById({
      currentOrganizationId: ctx.user.profile?.organizationId ?? null,
      eventTypeId: input.id,
      userId: ctx.user.id,
      prisma: ctx.prisma,
      isUserOrganizationAdmin: !!ctx.user?.organization?.isOrgAdmin,
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      const code = e instanceof NotFoundError ? "NOT_FOUND" : ("INTERNAL_SERVER_ERROR" as const);
      throw new TRPCError({
        code,
        message: e.message,
      });
    }
    throw e; // just to make sure we don't lose track if we get something unexpected.
  }
};
