import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    signIn("saml-idp", { callbackUrl: "/", code: router.query?.code });
  }, [router.isReady]);

  return null;
}
