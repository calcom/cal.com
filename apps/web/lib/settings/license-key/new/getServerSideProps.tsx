import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/feature-auth/lib/getServerSession";
import { getOptions } from "@calcom/feature-auth/lib/next-auth-options";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession({
    req: context.req,
    authOptions: getOptions({
      cookies: {
        utm_params: context.req.cookies.utm_params,
        dub_id: context.req.cookies.dub_id || context.req.cookies.dclid,
      },
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
