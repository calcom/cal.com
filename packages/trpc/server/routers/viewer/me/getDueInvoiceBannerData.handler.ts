import { DueInvoiceService } from "@calcom/features/ee/billing/service/dueInvoice/DueInvoiceService";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getDueInvoiceBannerDataHandler = async ({ ctx }: Props) => {
  const dueInvoiceService = new DueInvoiceService();
  return await dueInvoiceService.getBannerDataForUser(ctx.user.id);
};
