import { getProviders, getCsrfToken } from "next-auth/react";

import type { NextJsLegacyContext } from "@lib/buildLegacyCtx";

export async function getServerSideProps(context: NextJsLegacyContext) {
  const csrfToken = await getCsrfToken(context);
  const providers = await getProviders();
  return {
    props: {
      csrfToken,
      providers,
    },
  };
}
