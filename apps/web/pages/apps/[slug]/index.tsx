import { Prisma } from "@prisma/client";
import type { GetStaticPaths } from "next";

import { AppRepository } from "@calcom/lib/server/repository/app";

import { getStaticProps } from "@lib/apps/[slug]/getStaticProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/[slug]/slug-view";
import SingleAppPage from "~/apps/[slug]/slug-view";

const Page = (props: PageProps) => <SingleAppPage {...props} />;

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  let paths: { params: { slug: string } }[] = [];

  try {
    const appStore = await AppRepository.findAppStore();
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

export { getStaticProps };

Page.PageWrapper = PageWrapper;

export default Page;
