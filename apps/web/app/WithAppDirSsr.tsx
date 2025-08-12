import { notFound, redirect } from "next/navigation";

import type { NextJsLegacyContext } from "@lib/buildLegacyCtx";

export const withAppDirSsr =
  <T extends Record<string, any>>(
    getServerSideProps: (
      context: NextJsLegacyContext
    ) => Promise<{ props: T } | { redirect: any } | { notFound: true }>
  ) =>
  async (context: NextJsLegacyContext) => {
    const ssrResponse = await getServerSideProps(context);

    if ("redirect" in ssrResponse) {
      redirect(ssrResponse.redirect.destination);
    }
    if ("notFound" in ssrResponse) {
      notFound();
    }

    const props = await Promise.resolve(ssrResponse.props);

    return {
      ...props,
    };
  };
