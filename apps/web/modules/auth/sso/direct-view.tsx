"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import type { getServerSideProps } from "@server/lib/auth/sso/direct/getServerSideProps";

// This page is used to initiate the SAML authentication flow by redirecting to the SAML provider.
// Accessible only on self-hosted Cal.com instances.

export type SSODirectPageProps = inferSSRProps<typeof getServerSideProps>;
export default function Page({ samlTenantID, samlProductID }: SSODirectPageProps) {
  const router = useRouter();

  useEffect(() => {
    if (HOSTED_CAL_FEATURES) {
      router.push("/auth/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
