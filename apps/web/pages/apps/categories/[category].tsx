"use client";

import { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import PageWrapper from "@components/PageWrapper";
import Apps from "@components/pages/apps/categories/[category]";

Apps.PageWrapper = PageWrapper;

export const getStaticPaths = async () => {
  const paths = Object.keys(AppCategories);

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time. Make sure we fall back to building these pages on demand
      return {
        paths: [],
        fallback: "blocking",
      };
    } else {
      throw e;
    }
  }

  return {
    paths: paths.map((category) => ({ params: { category } })),
    fallback: false,
  };
};

export default Apps;

export { getStaticProps };
