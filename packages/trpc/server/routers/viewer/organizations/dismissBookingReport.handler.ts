import { getOrganizationWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TDismissBookingReportInputSchema } from "./dismissBookingReport.schema";

type DismissBookingReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDismissBookingReportInputSchema;
};

export const dismissBookingReportHandler = async ({ ctx, input }: DismissBookingReportOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to dismiss booking reports",
    });
  }

  const service = getOrganizationWatchlistOperationsService(organizationId);
  const result = await service.dismissReportByEmail({ email: input.email, userId: user.id });

  return { success: true, dismissed: result.count };
};

export default dismissBookingReportHandler;
