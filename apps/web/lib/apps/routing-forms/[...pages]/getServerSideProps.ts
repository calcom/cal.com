import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import type { AppGetServerSidePropsContext } from "@calcom/types/AppGetServerSideProps";
import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { z } from "zod";
import { routingServerSidePropsConfig } from "./app-routing.server-config";

const paramsSchema = z.object({
  pages: z.array(z.string()),
});

export async function getServerSideProps(
  context: GetServerSidePropsContext
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

  const session = await getServerSession({ req });
  const user = session?.user;

  const result = await getServerSideProps(context as AppGetServerSidePropsContext, prisma, user);

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
