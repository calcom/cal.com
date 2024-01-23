import { Prisma } from "@prisma/client";
import { withAppDirSsg } from "app/WithAppDirSsg";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { InferGetStaticPropsType } from "next";

import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import Apps from "@components/pages/apps/categories/[category]";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `${APP_NAME} | ${APP_NAME}`,
    () => ""
  );
};

export const generateStaticParams = async () => {
  const paths = Object.keys(AppCategories);

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time. Make sure we fall back to building these pages on demand
      return [];
    } else {
      throw e;
    }
  }

  return paths.map((category) => ({ category }));
};

type GetStaticPropsType = InferGetStaticPropsType<typeof getStaticProps>;

const getData = withAppDirSsg<GetStaticPropsType>(getStaticProps);

export default WithLayout({ getData, Page: Apps, getLayout: null })<"P">;
export const dynamic = "force-static";
