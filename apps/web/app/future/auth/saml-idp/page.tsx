import type { PageProps } from "app/_types";
import { signIn } from "next-auth/react";

export default async function Page({ params }: PageProps) {
  const code = params.code;

  await signIn("saml-idp", {
    callbackUrl: "/",
    code,
  });

  return null;
}
