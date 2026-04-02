import { bulkUpdateEventsToDefaultLocation } from "@calcom/app-store/_utils/bulkUpdateEventsToDefaultLocation";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TBulkUpdateToDefaultLocationInputSchema } from "./bulkUpdateToDefaultLocation.schema";

type BulkUpdateToDefaultLocationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkUpdateToDefaultLocationInputSchema;
};

export const bulkUpdateToDefaultLocationHandler = ({ ctx, input }: BulkUpdateToDefaultLocationOptions) => {
  const { eventTypeIds } = input;
  try {
    return bulkUpdateEventsToDefaultLocation({
      eventTypeIds,
      user: ctx.user,
      prisma,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }
    throw error;
  }
};
