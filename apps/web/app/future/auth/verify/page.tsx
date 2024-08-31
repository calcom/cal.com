import VerifyPage from "@pages/auth/verify";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { z } from "zod";

import { StripeRepository } from "@calcom/lib/server/repository/stripe";

import { getServerSideProps } from "@server/lib/auth/verify/getServerSideProps";

const querySchema = z.object({
  stripeCustomerId: z.string().optional(),
  sessionId: z.string().optional(),
  t: z.string().optional(),
});

export const generateMetadata = async ({ params }: PageProps) => {
  console.log("PARAMS123", params);

  const { sessionId, stripeCustomerId } = querySchema.parse(params);

  if (!stripeCustomerId && !sessionId) {
    return await _generateMetadata(
      () => "",
      () => ""
    );
  }

  const data = await StripeRepository.getCheckoutSession({
    stripeCustomerId,
    checkoutSessionId: sessionId,
  });

  const { hasPaymentFailed } = data;

  hasPaymentFailed ? "Your payment failed" : sessionId ? "Payment successful!" : `Verify your email`;
  return await _generateMetadata(
    () => "",
    () => ""
  );
};

export default WithLayout({
  getLayout: null,
  Page: VerifyPage,
  getData: withAppDirSsr(getServerSideProps),
})<"P">;
