import CategoryPage, { type PageProps } from "@pages/apps/categories/[category]";
import { Prisma } from "@prisma/client";
import { withAppDirSsg } from "app/WithAppDirSsg";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

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

const getData = withAppDirSsg<PageProps>(getStaticProps);

export default WithLayout({ getData, Page: CategoryPage, getLayout: null })<"P">;
export const dynamic = "force-static";
