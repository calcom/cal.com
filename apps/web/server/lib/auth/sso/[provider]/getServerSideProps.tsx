import type { GetServerSidePropsContext } from "next";

import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { hostedCal, isSAMLLoginEnabled, samlProductID, samlTenantID } from "@calcom/features/ee/sso/lib/saml";
import { ssoTenantProduct } from "@calcom/features/ee/sso/lib/sso";
import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";
import { checkUsername } from "@calcom/features/profile/lib/checkUsername";
import prisma from "@calcom/prisma";

import { asStringOrNull } from "@lib/asStringOrNull";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const providerParam = asStringOrNull(context.query.provider);
  const emailParam = asStringOrNull(context.query.email);
  const usernameParam = asStringOrNull(context.query.username);
  const successDestination = `/getting-started${usernameParam ? `?username=${usernameParam}` : ""}`;
  if (!providerParam) {
    throw new Error(`File is not named sso/[provider]`);
  }

  const { req } = context;

  const session = await getServerSession({ req });

  const { currentOrgDomain } = orgDomainConfig(context.req);

  if (session) {
    // Validating if username is Premium, while this is true an email its required for stripe user confirmation
    if (usernameParam && session.user.email) {
      const availability = await checkUsername(usernameParam, currentOrgDomain);
      if (availability.available && availability.premium && IS_PREMIUM_USERNAME_ENABLED) {
        const stripePremiumUrl = await getStripePremiumUsernameUrl({
          userId: session.user.id.toString(),
          userEmail: session.user.email,
          username: usernameParam,
          successDestination,
        });
        if (stripePremiumUrl) {
          return {
            redirect: {
              destination: stripePremiumUrl,
              permanent: false,
            },
          };
        }
      }
    }

    return {
      redirect: {
        destination: successDestination,
        permanent: false,
      },
    };
  }

  let error: string | null = null;

  let tenant = samlTenantID;
  let product = samlProductID;

  if (providerParam === "saml" && hostedCal) {
    if (!emailParam) {
      error = "Email not provided";
    } else {
      try {
        const ret = await ssoTenantProduct(prisma, emailParam);
        tenant = ret.tenant;
        product = ret.product;
      } catch (e) {
        if (e instanceof Error) {
          error = e.message;
        }
      }
    }
  }

  if (error) {
    return {
      redirect: {
        destination: `/auth/error?error=${error}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      provider: providerParam,
      isSAMLLoginEnabled,
      hostedCal,
      tenant,
      product,
      error,
    },
  };
};

type GetStripePremiumUsernameUrl = {
  userId: string;
  userEmail: string;
  username: string;
  successDestination: string;
};

const getStripePremiumUsernameUrl = async ({
  userId,
  userEmail,
  username,
  successDestination,
}: GetStripePremiumUsernameUrl): Promise<string | null> => {
  // @TODO: probably want to check if stripe user email already exists? or not
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: {
      email: userEmail,
      username,
    },
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [
      {
        price: getPremiumMonthlyPlanPriceId(),
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}${successDestination}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com",
    allow_promotion_codes: true,
    metadata: {
      dubCustomerId: userId, // pass the userId during checkout creation for sales conversion tracking: https://d.to/conversions/stripe
    },
  });

  return checkoutSession.url;
};
