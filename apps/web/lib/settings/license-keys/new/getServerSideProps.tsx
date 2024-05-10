import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/feature-auth/lib/getServerSession";
import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession({
    req: context.req,
    res: context.res,
    authOptions: AUTH_OPTIONS,
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
