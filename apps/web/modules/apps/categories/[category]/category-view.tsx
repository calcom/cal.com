"use client";

import type { InferGetStaticPropsType } from "next";
import Link from "next/link";

import Shell from "@calcom/features/shell/Shell";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AppCard, SkeletonText } from "@calcom/ui";

import type { getStaticProps } from "@lib/apps/categories/[category]/getStaticProps";

export type PageProps = InferGetStaticPropsType<typeof getStaticProps>;
export default function Apps({ apps }: PageProps) {
  const searchParams = useCompatSearchParams();
  const { t, isLocaleReady } = useLocale();
  const category = searchParams?.get("category");

  return (
    <>
      <Shell
        isPublic
        backPath="/apps"
        title={t("app_store")}
        description={t("app_store_description")}
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
            {apps
              ?.sort((a, b) => (b.installCount || 0) - (a.installCount || 0))
              .map((app) => {
                return <AppCard key={app.slug} app={app} />;
              })}
          </div>
        </div>
      </Shell>
    </>
  );
}
