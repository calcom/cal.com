import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

import PageWrapper from "@components/PageWrapper";

// To handle the IdP initiated login flow callback
export default function Page() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const { code } = router.query;

    signIn("saml-idp", {
      callbackUrl: "/",
      code,
    });
  }, []);

  return null;
}
Page.PageWrapper = PageWrapper;
