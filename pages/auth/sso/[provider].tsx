import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

import { asStringOrNull } from "@lib/asStringOrNull";
import prisma from "@lib/prisma";
import { isSAMLLoginEnabled, hostedCal, samlTenantID, samlProductID, samlTenantProduct } from "@lib/saml";
import { inferSSRProps } from "@lib/types/inferSSRProps";

export type SSOProviderPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Type(props: SSOProviderPageProps) {
  const router = useRouter();

  if (props.provider === "saml") {
    const email = typeof router.query?.email === "string" ? router.query?.email : null;

    if (!email) {
      router.push("/auth/error?error=" + "Email not provided");
      return null;
    }

    if (!props.isSAMLLoginEnabled) {
      router.push("/auth/error?error=" + "SAML login not enabled");
      return null;
    }

    signIn("saml", {}, { tenant: props.tenant, product: props.product });
  } else {
    signIn(props.provider);
  }

  return null;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const providerParam = asStringOrNull(context.query.provider);
  const emailParam = asStringOrNull(context.query.email);

  if (!providerParam) {
    throw new Error(`File is not named sso/[provider]`);
  }

  let error: string | null = null;

  let tenant = samlTenantID;
  let product = samlProductID;

  if (providerParam === "saml") {
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
      provider: providerParam,
      isSAMLLoginEnabled,
      hostedCal,
      tenant,
      product,
      error,
    },
  };
};
