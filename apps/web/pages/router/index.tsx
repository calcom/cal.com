"use client";

import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import PageWrapper from "@components/PageWrapper";
import Head from "next/head";
import { getServerSideProps } from "../../server/lib/router/getServerSideProps";

export default function Router({ form, message, errorMessage }: inferSSRProps<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>{form?.name} | Cal.com Forms</title>
      </Head>
      <div className="mx-auto my-0 max-w-3xl md:my-24">
        <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
          <div className="text-default bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via markdownToSafeHTML */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: markdownToSafeHTML(message || errorMessage),
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

Router.PageWrapper = PageWrapper;

export { getServerSideProps };
