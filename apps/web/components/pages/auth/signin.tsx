"use client";

import type { getProviders } from "next-auth/react";
import { signIn } from "next-auth/react";

import { Button } from "@calcom/ui";

import type { AppProps } from "@lib/app-providers";

const signin: React.FC<{ providers: Awaited<ReturnType<typeof getProviders>> }> & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
} = ({ providers }) => {
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
};

export default signin;
