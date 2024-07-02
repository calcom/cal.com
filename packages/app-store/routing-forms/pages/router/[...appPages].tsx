"use client";

import Head from "next/head";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getServerSideProps } from "./getServerSideProps";

export default function Router({ form, message }: inferSSRProps<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>{form.name} | Cal.com Forms</title>
      </Head>
      <div className="mx-auto my-0 max-w-3xl md:my-24">
        <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
          <div className="bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
            <div>{message}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export { getServerSideProps };
