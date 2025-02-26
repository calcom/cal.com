import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { z } from "zod";

import { StripeService } from "@calcom/lib/server/service/stripe";

import VerifyPage from "~/auth/verify-view";

const querySchema = z.object({
  stripeCustomerId: z.string().optional(),
  sessionId: z.string().optional(),
  t: z.string().optional(),
});

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const p = { ...params, ...searchParams };
  const { sessionId, stripeCustomerId } = querySchema.parse(p);

  const data = await StripeService.getCheckoutSession({
    stripeCustomerId,
    checkoutSessionId: sessionId,
  });

  const { hasPaymentFailed } = data;

  return await _generateMetadata(
    () =>
      hasPaymentFailed ? "Your payment failed" : sessionId ? "Payment successful!" : `Verify your email`,
    () => ""
  );
};

const ServerPage = () => {
  return <VerifyPage EMAIL_FROM={process.env.EMAIL_FROM} />;
};

export default ServerPage;
