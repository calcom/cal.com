"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

import type { AppProps } from "@lib/app-providers";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import { type getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";

export type SSOProviderPageProps = inferSSRProps<typeof getServerSideProps>;

const Provider: React.FC<SSOProviderPageProps> & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
} = (props) => {
  const searchParams = useCompatSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (props.provider === "saml") {
      const email = searchParams?.get("email");

      if (!email) {
        router.push(`/auth/error?error=Email not provided`);
        return;
      }

      if (!props.isSAMLLoginEnabled) {
        router.push(`/auth/error?error=SAML login not enabled`);
        return;
      }

      signIn("saml", {}, { tenant: props.tenant, product: props.product });
    } else {
      signIn(props.provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

export default Provider;
