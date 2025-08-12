import { getServerSession } from "@calcom/feature-auth/lib/getServerSession";
import { getOptions } from "@calcom/feature-auth/lib/next-auth-options";

import type { NextJsLegacyContext } from "@lib/buildLegacyCtx";

export const getServerSideProps = async (context: NextJsLegacyContext) => {
  const session = await getServerSession({
    req: { headers: context.req.headers, cookies: context.req.cookies } as any,
    authOptions: getOptions({
      getDubId: () => context.req.cookies.dub_id || context.req.cookies.dclid,
    }),
  });
  // Disable this check if we ever make this self serve.
  if (session?.user.role !== "ADMIN") {
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {},
  };
};
