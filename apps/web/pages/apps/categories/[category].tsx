import { ChevronLeftIcon } from "@heroicons/react/solid";
import { AppCategories } from "@prisma/client";
import { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";

import Shell from "@components/Shell";
import AppCard from "@components/apps/AppCard";

export default function Apps({ apps }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <>
      <Shell isPublic large>
        <div className="-mx-4 md:-mx-8">
          <div className="mb-10 bg-gray-50 px-4 pb-2">
            <Link href="/apps">
              <a className="mt-2 inline-flex px-1 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                <ChevronLeftIcon className="h-5 w-5" /> {t("browse_apps")}
              </a>
            </Link>
          </div>
        </div>
        <div className="mb-16">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">All {router.query.category} apps</h2>
          <div className="grid-col-1 grid grid-cols-1 gap-3 md:grid-cols-3">
            {apps.map((app) => {
              return (
                <AppCard
                  key={app.name}
                  slug={app.slug}
                  name={app.name}
                  description={app.description}
                  logo={app.logo}
                  rating={app.rating}
                />
              );
            })}
          </div>
        </div>
      </Shell>
    </>
  );
}

export const getStaticPaths = async () => {
  const appStore = await getAppRegistry();
  const paths = appStore.reduce((categories, app) => {
    if (!categories.includes(app.category)) {
      categories.push(app.category);
    }
    return categories;
  }, [] as string[]);

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
  const appSlugs = appQuery.map((category) => category.slug);

  const appStore = await getAppRegistry();

  const apps = appStore.filter((app) => appSlugs.includes(app.slug));

  return {
    props: {
      apps: apps,
    },
  };
};
