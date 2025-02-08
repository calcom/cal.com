import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getRoutedUrl } from "@calcom/lib/server";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Cal.com Forms",
    () => ""
  );
};

export default async function Router({ params, searchParams }: PageProps) {
  const headersList = headers();
  const context = buildLegacyCtx(headersList, cookies(), params, searchParams);
  const path = headersList.get("x-invoke-path"); // e.g. "/blog/post"
  const query = headersList.get("x-invoke-query") ?? ""; // e.g. "?id=123"
  const url = path + query; // gives you "/blog/post?id=123"
  const response = await getRoutedUrl({ query: context.query, req: { ...context.req, url } } as Pick<
    GetServerSidePropsContext,
    "query" | "req"
  >);
  if (response?.redirect !== undefined) {
    redirect(response.redirect.destination);
  }
  if (response?.notFound !== undefined) {
    notFound();
  }

  const { message } = await Promise.resolve(response.props);

  return (
    <div className="mx-auto my-0 max-w-3xl md:my-24">
      <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
        <div className="text-default bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
          <div>{message}</div>
        </div>
      </div>
    </div>
  );
}
