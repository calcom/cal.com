import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZSendPaymentLinkInputSchema } from "./sendPaymentLink.schema";

interface SendPaymentLinkHandlerOptions {
  ctx: { user: NonNullable<TrpcSessionUser>; prisma: PrismaClient };
  input: ZSendPaymentLinkInputSchema;
}
export const sendPaymentLinkHandler = async ({ ctx, input }: SendPaymentLinkHandlerOptions) => {
  const { prisma } = ctx;

  console.log({ sendPaymentLinkHandler: "sendPaymentLinkHandler", input });

  return true;
};
