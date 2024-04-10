import Page from "@pages/apps/[slug]/index";
import { Prisma } from "@prisma/client";
import { withAppDirSsg } from "app/WithAppDirSsg";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { InferGetStaticPropsType } from "next";
import { cookies, headers } from "next/headers";

import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

type Y = InferGetStaticPropsType<typeof getStaticProps>;
const getData = withAppDirSsg<Y>(getStaticProps);

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Record<string, string | string[]>;
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const legacyContext = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const res = await getData(legacyContext);

  return await _generateMetadata(
    () => `${res?.data.name} | ${APP_NAME}`,
    () => res?.data.description ?? ""
  );
};

export const generateStaticParams = async () => {
  try {
    const appStore = await prisma.app.findMany({ select: { slug: true } });
    return appStore.map(({ slug }) => ({ slug }));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time, but that's ok – we fall back to resolving paths on demand
    } else {
      throw e;
    }
  }

  return [];
};

export default WithLayout({ getLayout: null, Page, getData });

export const dynamic = "force-static";
