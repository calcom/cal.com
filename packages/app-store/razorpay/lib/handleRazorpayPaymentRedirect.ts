import crypto from "crypto";

import { RAZORPAY_CLIENT_SECRET } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import prisma from "@calcom/prisma";

interface PaymentParams {
  razorpay_payment_id?: string;
  razorpay_payment_link_id?: string;
  razorpay_payment_link_reference_id?: string;
  razorpay_payment_link_status?: string;
  razorpay_signature?: string;
}

const log = logger.getSubLogger({ prefix: ["[handleRazorpayPaymentRedirect]"] });

const validatePaymentRedirect = (params: PaymentParams, signature: string): boolean => {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
  } = params;

  if (
    !razorpay_payment_id ||
    !razorpay_payment_link_id ||
    !razorpay_payment_link_reference_id ||
    !razorpay_payment_link_status
  ) {
    return false;
  }

  const payload = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
  if (!RAZORPAY_CLIENT_SECRET || typeof RAZORPAY_CLIENT_SECRET !== "string") return false;
  const expectedSignature = crypto.createHmac("sha256", RAZORPAY_CLIENT_SECRET).update(payload).digest("hex");

  return expectedSignature === signature;
};

const handleRazorpayPaymentRedirect = async (params: PaymentParams): Promise<string> => {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_signature,
    razorpay_payment_link_status,
    razorpay_payment_link_reference_id,
  } = params;

  if (
    !razorpay_payment_id ||
    !razorpay_payment_link_id ||
    !razorpay_signature ||
    !razorpay_payment_link_status ||
    !razorpay_payment_link_reference_id
  ) {
    log.error("error:Payment callback malfunctioned");

    return "error";
  }

  try {
    if (!validatePaymentRedirect(params, razorpay_signature)) {
      log.error("error:Payment verification failed");
      return "error";
    }
    if (razorpay_payment_link_status !== "paid") {
      log.error("error:Payment not made");
      return "failed";
    }

    const payment = await prisma.payment.findUnique({
      where: { externalId: razorpay_payment_link_id },
      select: { id: true, bookingId: true, success: true },
    });

    if (!payment) {
      log.error("error:Payment not found");
      return "error";
    }

    if (payment.success) {
      log.warn(`Payment with id '${payment.id}' was already paid and confirmed.`);
      return "success";
    }

    await handlePaymentSuccess(payment.id, payment.bookingId, { paymentId: razorpay_payment_id });
    return "success";
  } catch (e) {
    log.error(`Error handling payment success redirect:${JSON.stringify(e)}`);
    if (e instanceof HttpCode) {
      // Security/validation errors - return error status for Razorpay to stop retrying
      return e.statusCode === 200 ? "success" : "error";
    }
    return "error";
  }
};

export default handleRazorpayPaymentRedirect;
