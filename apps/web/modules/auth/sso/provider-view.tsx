"use client";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect } from "react";

export type SSOProviderPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Provider(props: SSOProviderPageProps) {
  const searchParams = useCompatSearchParams();
  const router = useRouter();

  useEffect(() => {
    const email = searchParams?.get("email");
    if (props.provider === "saml") {
      if (!email) {
        router.push(`/auth/error?error=Email not provided`);
        return;
      }

      if (!props.isSAMLLoginEnabled) {
        router.push(`/auth/error?error=SAML login not enabled`);
        return;
      }

      signIn("saml", {}, { tenant: props.tenant, product: props.product });
    } else if (props.provider === "google" && email) {
      signIn("google", {}, { login_hint: email });
    } else {
      signIn(props.provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
