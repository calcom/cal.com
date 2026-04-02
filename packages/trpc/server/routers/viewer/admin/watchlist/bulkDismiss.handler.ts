import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import type { TrpcSessionUser } from "../../../../types";
import type { TBulkDismissReportsInputSchema } from "./bulkDismiss.schema";

type BulkDismissReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkDismissReportsInputSchema;
};

export const bulkDismissReportsHandler = async ({ input }: BulkDismissReportsOptions) => {
  const service = getAdminWatchlistOperationsService();
  return service.bulkDismissReportsByEmail({ emails: input.emails });
};
