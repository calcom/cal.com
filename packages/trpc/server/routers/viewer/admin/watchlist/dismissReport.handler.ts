import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import type { TrpcSessionUser } from "../../../../types";
import type { TDismissReportInputSchema } from "./dismissReport.schema";

type DismissReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDismissReportInputSchema;
};

export const dismissReportHandler = async ({ input }: DismissReportOptions) => {
  const service = getAdminWatchlistOperationsService();
  const result = await service.dismissReportByEmail({ email: input.email });

  return {
    success: result.count,
    failed: 0,
    message: `Dismissed ${result.count} report(s) successfully`,
  };
};
