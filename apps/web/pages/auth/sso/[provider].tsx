import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

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
  }, []);
  return null;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const providerParam = asStringOrNull(context.query.provider);
  const emailParam = asStringOrNull(context.query.email);
  const usernameParam = asStringOrNull(context.query.username);

  if (!providerParam) {
    throw new Error(`File is not named sso/[provider]`);
  }

  const { req } = context;

  const session = await getSession({ req });
  const ssr = await ssrInit(context);

  if (session) {
    return {
      redirect: {
        destination: "/getting-started" + (usernameParam ? `?username=${usernameParam}` : ""),
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
