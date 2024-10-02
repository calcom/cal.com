"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";



// To handle the IdP initiated login flow callback
export default function SamlIdp() {
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
