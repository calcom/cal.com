import type { PageProps as _PageProps } from "app/_types";
import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getRoutedUrl } from "@calcom/lib/server";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

const getCachedRoutingFormData = cache(async (legacyCtx: GetServerSidePropsContext) => {
  return await getRoutedUrl(legacyCtx);
});

export default async function RouterPage({ params, searchParams }: _PageProps) {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const result = await getCachedRoutingFormData(legacyCtx);

  if (result.redirect) {
    redirect(result.redirect.destination);
  }

  return (
    <div className="mx-auto my-0 max-w-3xl md:my-24">
      <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
        <div className="text-default bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
          <div>{result.props?.message}</div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: _PageProps) {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const result = await getCachedRoutingFormData(legacyCtx);

  return {
    title: `${result.props?.form?.name} | Cal.com Forms`,
  };
}
