import type { WorkflowContext } from "@calid/job-dispatcher";

import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import { prisma } from "@calcom/prisma";

import type { RazorpayPaymentLinkPaidJobData } from "./type";

const log = logger.getSubLogger({ prefix: ["[job-engine/razorpay-payment-link-paid]"] });

// ============================================================================
// MAIN WORKFLOW EXPORT
// ============================================================================

export async function razorpayPaymentLinkPaidService(
  ctx: WorkflowContext,
  payload: RazorpayPaymentLinkPaidJobData
): Promise<{ success: boolean; message: string }> {
  const { paymentId, paymentLinkId } = payload;

  log.info(`Processing PAYMENT_LINK_PAID: ${paymentId}`);

  // Step 1: Find payment
  const payment = await ctx.run("find-payment", async () => {
    return await prisma.payment.findUnique({
      where: { externalId: paymentLinkId },
      select: { id: true, bookingId: true, success: true },
    });
  });

  if (!payment) {
    log.warn(`Payment not found for paymentLinkId: ${paymentLinkId}`);
    return { success: false, message: "Payment not found" };
  }

  // Step 2: Process payment if not already successful
  if (!payment.success) {
    await ctx.run("process-payment", async () => {
      try {
        await handlePaymentSuccess(payment.id, payment.bookingId, { paymentId });
        log.info(`Successfully processed payment: ${paymentId}`);
      } catch (error) {
        // If it's a 200 status code, treat it as success - not a real error
        if (error instanceof HttpCode && error.statusCode === 200) {
          return {
            success: true,
            message: `Payment ${paymentId} processed successfully`,
          };
        }
        throw error;
      }
    });

    ctx.log(`Payment ${paymentId} processed successfully`);

    return {
      success: true,
      message: `Payment ${paymentId} processed successfully`,
    };
  }

  log.info(`Payment ${paymentId} already marked as successful`);
  ctx.log(`Payment ${paymentId} already successful - skipping`);

  return {
    success: true,
    message: `Payment ${paymentId} already successful`,
  };
}
