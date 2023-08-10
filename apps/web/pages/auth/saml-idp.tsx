import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import PageWrapper from "@components/PageWrapper";

// To handle the IdP initiated login flow callback
export default function Page() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams?.get("code");

    signIn("saml-idp", {
      callbackUrl: "/",
      code,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
Page.PageWrapper = PageWrapper;
