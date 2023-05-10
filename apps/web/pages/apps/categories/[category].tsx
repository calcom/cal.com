import type { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";
import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import { AppCard, SkeletonText } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function Apps({ apps }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t, isLocaleReady } = useLocale();
  const router = useRouter();
  const { category } = router.query;

  return (
    <>
      <Shell
        isPublic
        backPath="/apps"
        smallHeading
        heading={
          <>
            <Link
              href="/apps"
              className="text-emphasis inline-flex items-center justify-start gap-1 rounded-sm py-2">
              {isLocaleReady ? t("app_store") : <SkeletonText className="h-4 w-24" />}{" "}
            </Link>
            {category && (
              <span className="text-default gap-1">
                <span>&nbsp;/&nbsp;</span>
                {t("category_apps", { category: category[0].toUpperCase() + category?.slice(1) })}
              </span>
            )}
          </>
        }>
        <div className="mb-16">
          <div className="grid-col-1 grid grid-cols-1 gap-3 md:grid-cols-3">
            {apps.map((app) => {
              return <AppCard key={app.slug} app={app} />;
            })}
          </div>
        </div>
      </Shell>
    </>
  );
}

Apps.PageWrapper = PageWrapper;

export const getStaticPaths = async () => {
  const paths = Object.keys(AppCategories);

  return {
    paths: paths.map((category) => ({ params: { category } })),
    fallback: false,
  };
};

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const category = context.params?.category as AppCategories;

  const appQuery = await prisma.app.findMany({
    where: {
      categories: {
        has: category,
      },
    },
    select: {
      slug: true,
    },
  });

  const dbAppsSlugs = appQuery.map((category) => category.slug);

  const appStore = await getAppRegistry();

  const apps = appStore.filter((app) => dbAppsSlugs.includes(app.slug));
  return {
    props: {
      apps,
    },
  };
};
