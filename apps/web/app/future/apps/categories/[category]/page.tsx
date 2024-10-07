import { withAppDirSsg } from "app/WithAppDirSsg";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { AppCategories } from "@calcom/prisma/enums";
import { isPrismaAvailableCheck } from "@calcom/prisma/is-prisma-available-check";

import { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

import CategoryPage, { type PageProps } from "~/apps/categories/[category]/category-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description")
  );
};

export const generateStaticParams = async () => {
  const paths = Object.keys(AppCategories);
  const isPrismaAvailable = await isPrismaAvailableCheck();

  if (!isPrismaAvailable) {
    // Database is not available at build time. Make sure we fall back to building these pages on demand
    return [];
  }

  return paths.map((category) => ({ category }));
};

const getData = withAppDirSsg<PageProps>(getStaticProps);

export default WithLayout({ getData, Page: CategoryPage, getLayout: null })<"P">;
export const dynamic = "force-static";
