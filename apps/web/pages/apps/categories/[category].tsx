import { AppCategories } from "@calcom/prisma/enums";
import { isPrismaAvailableCheck } from "@calcom/prisma/is-prisma-available-check";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/apps/categories/[category]/category-view";
import CategoryView from "~/apps/categories/[category]/category-view";

const Page = (props: PageProps) => <CategoryView {...props} />;
Page.PageWrapper = PageWrapper;

export const getStaticPaths = async () => {
  const paths = Object.keys(AppCategories);
  const isPrismaAvailable = await isPrismaAvailableCheck();
  if (!isPrismaAvailable) {
    // Database is not available at build time. Make sure we fall back to building these pages on demand
    return {
      paths: [],
      fallback: "blocking",
    };
  }

  return {
    paths: paths.map((category) => ({ params: { category } })),
    fallback: false,
  };
};

export default Page;

export { getStaticProps };
