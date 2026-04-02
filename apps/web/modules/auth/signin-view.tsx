"use client";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button } from "@calcom/ui/components/button";
import type { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";
import { signIn } from "next-auth/react";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
function Signin({ providers }: PageProps) {
  if (!providers) {
    return null;
  }

  return (
    <div className="center mt-10 justify-between stack-y-5 text-center align-baseline">
      {Object.values(providers).map((provider) => {
        return (
          <div key={provider.name}>
            <Button onClick={() => signIn(provider.id)}>Sign in with {provider.name}</Button>
          </div>
        );
      })}
    </div>
  );
}

export default Signin;
