"use client";

import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { signIn } from "next-auth/react";

import { Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { getLegacyPageProps } from "@server/lib/getLegacyPageProps";
import { getSignInData } from "@server/lib/singInGetData";

function Signin({ providers }: NonNullable<InferGetServerSidePropsType<typeof getServerSideProps>>) {
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

Signin.PageWrapper = PageWrapper;

export default Signin;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) =>
  getLegacyPageProps(ctx, getSignInData);
