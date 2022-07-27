import { InferGetStaticPropsType } from "next";
import Link from "next/link";

import { getAppRegistry } from "@calcom/app-store/_appRegistry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";

import Shell from "@components/Shell";
import AppStoreCategories from "@components/apps/Categories";

export default function Apps({ categories }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useLocale();

  return (
    <Shell isPublic large>
      <div className="-mx-4 md:-mx-8">
        <div className="mb-10 bg-gray-50 px-4 pb-2">
          <Link href="/apps">
            <a className="mt-2 inline-flex px-1 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800">
              <Icon.ChevronLeft className="h-5 w-5" /> {t("browse_apps")}
            </a>
          </Link>
        </div>
      </div>
      <div className="mb-16">
        <AppStoreCategories categories={categories} />
      </div>
    </Shell>
  );
}

export const getStaticProps = async () => {
  const appStore = await getAppRegistry();
  const categories = appStore.reduce((c, app) => {
    c[app.category] = c[app.category] ? c[app.category] + 1 : 1;
    return c;
  }, {} as Record<string, number>);

  return {
    props: {
      categories: Object.entries(categories).map(([name, count]) => ({ name, count })),
    },
  };
};
