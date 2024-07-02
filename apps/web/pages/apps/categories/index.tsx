"use client";

import Link from "next/link";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Icon, SkeletonText } from "@calcom/ui";

import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

export default function Apps({ categories }: Omit<inferSSRProps<typeof getServerSideProps>, "trpcState">) {
  const { t, isLocaleReady } = useLocale();

  return (
    <Shell
      isPublic
      large
      hideHeadingOnMobile
      title="Apps Store"
      description="Connecting people, technology and the workplace.">
      <div className="text-md flex items-center gap-1 px-4 pb-3 pt-3 font-normal md:px-8 lg:px-0 lg:pt-0">
        <Link
          href="/apps"
          className="text-emphasis inline-flex items-center justify-start gap-1 rounded-sm py-2">
          <Icon name="arrow-left" className="h-4 w-4" />
          {isLocaleReady ? t("app_store") : <SkeletonText className="h-6 w-24" />}{" "}
        </Link>
      </div>
      <div className="mb-16">
        <div className="grid h-auto w-full grid-cols-5 gap-3">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/apps/categories/${category.name}`}
              data-testid={`app-store-category-${category.name}`}
              className="bg-subtle relative flex rounded-sm px-6 py-4 sm:block">
              <div className="self-center">
                <h3 className="font-medium capitalize">{category.name}</h3>
                <p className="text-subtle text-sm">
                  {t("number_apps", { count: category.count })}{" "}
                  <Icon name="arrow-right" className="inline-block h-4 w-4" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Apps.PageWrapper = PageWrapper;

export { getServerSideProps };
