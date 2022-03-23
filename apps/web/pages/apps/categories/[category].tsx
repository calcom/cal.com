import { ChevronLeftIcon } from "@heroicons/react/solid";
import { InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";

import Shell from "@components/Shell";
import AppCard from "@components/apps/AppCard";

export default function Apps({ appStore }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <Shell
      heading={router.query.category + " - " + t("app_store")}
      subtitle={t("app_store_description")}
      large>
      <div className="mb-8">
        <Button color="secondary" href="/apps">
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="mb-16">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">All {router.query.category} apps</h2>
        <div className="grid grid-cols-3 gap-3">
          {appStore.map((app) => {
            return (
              app.category === router.query.category && (
                <AppCard
                  key={app.name}
                  slug={app.slug}
                  name={app.name}
                  description={app.description}
                  logo={app.logo}
                  rating={app.rating}
                />
              )
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

export const getStaticPaths = async () => {
  const appStore = getAppRegistry();
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

export const getStaticProps = async () => {
  return {
    props: {
      appStore: getAppRegistry(),
    },
  };
};
