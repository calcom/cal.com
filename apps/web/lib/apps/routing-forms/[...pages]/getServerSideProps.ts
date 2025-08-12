import type { GetServerSidePropsResult } from "next";
import { z } from "zod";

import { routingServerSidePropsConfig } from "@calcom/app-store/routing-forms/pages/app-routing.server-config";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import type { NextJsLegacyContext } from "@lib/buildLegacyCtx";

const paramsSchema = z.object({
  pages: z.array(z.string()),
});

export async function getServerSideProps(
  context: NextJsLegacyContext
): Promise<GetServerSidePropsResult<any>> {
  const { params, req } = context;

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return {
      notFound: true,
    };
  }

  const pages = parsedParams.data.pages;
  const mainPage = pages[0];
  const getServerSideProps = routingServerSidePropsConfig[mainPage];

  if (!getServerSideProps) {
    return { notFound: true };
  }

  const session = await getServerSession({ req: { headers: req.headers, cookies: req.cookies } as any });
  const user = session?.user;

  const result = await getServerSideProps(context, prisma, user);

  if (result.notFound) {
    return { notFound: true };
  }

  if (result.redirect) {
    return { redirect: result.redirect };
  }

  return {
    props: {
      appUrl: "/routing",
      ...result.props,
    },
  };
}
