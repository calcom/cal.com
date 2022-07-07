import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { checkPremiumUsername } from "@calcom/ee/lib/core/checkPremiumUsername";
import stripe from "@calcom/stripe/server";
import { getPremiumPlanPrice } from "@calcom/stripe/utils";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { isSAMLLoginEnabled, hostedCal, samlTenantID, samlProductID, samlTenantProduct } from "@lib/saml";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { ssrInit } from "@server/lib/ssr";

export type SSOProviderPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Provider(props: SSOProviderPageProps) {
  const router = useRouter();

  useEffect(() => {
    if (props.provider === "saml") {
      const email = typeof router.query?.email === "string" ? router.query?.email : null;

      if (!email) {
        router.push("/auth/error?error=" + "Email not provided");
        return;
      }

      if (!props.isSAMLLoginEnabled) {
        router.push("/auth/error?error=" + "SAML login not enabled");
        return;
      }

      signIn("saml", {}, { tenant: props.tenant, product: props.product });
    } else {
      signIn(props.provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const providerParam = asStringOrNull(context.query.provider);
  const emailParam = asStringOrNull(context.query.email);
  const usernameParam = asStringOrNull(context.query.username);
  const successDestination = "/getting-started" + (usernameParam ? `?username=${usernameParam}` : "");
  if (!providerParam) {
    throw new Error(`File is not named sso/[provider]`);
  }

  const { req } = context;

  const session = await getSession({ req });
  const ssr = await ssrInit(context);

  if (session) {
    // Validating if username is Premium, while this is true an email its required for stripe user confirmation
    if (usernameParam && session.user.email) {
      const availability = await checkPremiumUsername(usernameParam);
      if (availability.available && availability.premium) {
        const stripePremiumUrl = await getStripePremiumUsernameUrl({
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
        const ret = await samlTenantProduct(prisma, emailParam);
        tenant = ret.tenant;
        product = ret.product;
      } catch (e: any) {
        error = e.message;
      }
    }
  }

  if (error) {
    return {
      redirect: {
        destination: "/auth/error?error=" + error,
        permanent: false,
      },
    };
  }

  return {
    props: {
      trpcState: ssr.dehydrate(),
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
  userEmail: string;
  username: string;
  successDestination: string;
};

const getStripePremiumUsernameUrl = async ({
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
    payment_method_types: ["card"],
    customer: customer.id,
    line_items: [
      {
        price: getPremiumPlanPrice(),
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}${successDestination}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com",
    allow_promotion_codes: true,
  });

  return checkoutSession.url;
};
