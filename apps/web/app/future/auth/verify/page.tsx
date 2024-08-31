import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { z } from "zod";

import { StripeRepository } from "@calcom/lib/server/repository/stripe";

import { getServerSideProps } from "@server/lib/auth/verify/getServerSideProps";

import type { PageProps } from "~/auth/verify-view";
import VerifyPage from "~/auth/verify-view";

const querySchema = z.object({
  stripeCustomerId: z.string().optional(),
  sessionId: z.string().optional(),
  t: z.string().optional(),
});

export const generateMetadata = async ({ params }: _PageProps) => {
  const { sessionId, stripeCustomerId } = querySchema.parse(params);

  if (!stripeCustomerId && !sessionId) {
    return await _generateMetadata(
      () => "Verify",
      () => ""
    );
  }

  const data = await StripeRepository.getCheckoutSession({
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

export default WithLayout({
  getLayout: null,
  Page: VerifyPage,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
})<"P">;
