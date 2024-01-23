"use client";

import { Prisma } from "@prisma/client";
import type { GetStaticPaths } from "next";

import prisma from "@calcom/prisma";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";

import PageWrapper from "@components/PageWrapper";
import SingleAppPage from "@components/pages/apps/[slug]";

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  let paths: { params: { slug: string } }[] = [];

  try {
    const appStore = await prisma.app.findMany({ select: { slug: true } });
    paths = appStore.map(({ slug }) => ({ params: { slug } }));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      // Database is not available at build time, but that's ok – we fall back to resolving paths on demand
    } else {
      throw e;
    }
  }

  return {
    paths,
    fallback: "blocking",
  };
};

SingleAppPage.PageWrapper = PageWrapper;

export default SingleAppPage;
export { getStaticProps };
