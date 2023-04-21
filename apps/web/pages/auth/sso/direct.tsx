import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { samlProductID, samlTenantID } from "@calcom/features/ee/sso/lib/saml";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

// This page is used to initiate the SAML authentication flow by redirecting to the SAML provider.
// Accessible only on self-hosted Cal.com instances.
export default function Page({ samlTenantID, samlProductID }: inferSSRProps<typeof getServerSideProps>) {
  const router = useRouter();

  useEffect(() => {
    if (HOSTED_CAL_FEATURES) {
      router.push("/auth/login");
    }
  }, []);

  useEffect(() => {
    // Initiate SAML authentication flow
    signIn(
      "saml",
      {
        callbackUrl: "/",
      },
      { tenant: samlTenantID, product: samlProductID }
    );
  }, []);

  return null;
}

Page.PageWrapper = PageWrapper;

export async function getServerSideProps() {
  return {
    props: {
      samlTenantID,
      samlProductID,
    },
  };
}
