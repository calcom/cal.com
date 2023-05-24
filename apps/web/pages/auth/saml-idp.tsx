import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import PageWrapper from "@components/PageWrapper";

// To handle the IdP initiated login flow callback
export default function Page() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!true) {
      return;
    }

    const code = searchParams?.get("code");

    signIn("saml-idp", {
      callbackUrl: "/",
      code,
    });
  }, []);

  return null;
}
Page.PageWrapper = PageWrapper;
