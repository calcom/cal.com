"use client";

import type { getProviders } from "next-auth/react";
import { signIn } from "next-auth/react";

import { Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

function signin({ providers }: { providers: Awaited<ReturnType<typeof getProviders>> }) {
  if (!providers) {
    return null;
  }

  return (
    <div className="center mt-10 justify-between space-y-5 text-center align-baseline">
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

signin.PageWrapper = PageWrapper;

export default signin;

export { getServerSideProps };
