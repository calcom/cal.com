import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import { Slider } from "./Slider";

export function AppStoreCategories({
  categories,
}: {
  categories: {
    name: string;
    count: number;
  }[];
}) {
  const { t, isLocaleReady } = useLocale();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div>
        <div className="mb-2">
          <div className="flex cursor-default items-center pb-3">
            {isLocaleReady ? (
              <div>
                <h2 className="text-emphasis mt-0 text-base font-semibold leading-none">
                  {t("featured_categories")}
                </h2>
              </div>
            ) : (
              <SkeletonText className="h-4 w-24" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {categories.slice(0, 5).map((category) => (
              <div
                key={category.name}
                className="relative flex rounded-md"
                style={{
                  background: "radial-gradient(farthest-side at top right, #a2abbe 0%, #E3E3E3 100%)",
                }}>
                <div className="dark:bg-muted light:bg-[url('/noise.svg')] dark:from-subtle dark:to-muted w-full self-center bg-cover bg-center bg-no-repeat px-6 py-4 dark:bg-gradient-to-tr">
                  <div className="h-[100px] w-[100px]" />
                  <h3 className="text-emphasis text-sm font-semibold capitalize">{category.name}</h3>
                  <p className="text-subtle pt-2 text-sm font-medium">
                    {t("number_apps", { count: category.count })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Slider
        title={t("featured_categories")}
        items={categories}
        itemKey={(category) => category.name}
        options={{
          perView: 5,
          breakpoints: {
            768 /* and below */: {
              perView: 2,
            },
          },
        }}
        renderItem={(category) => (
          <Link
            key={category.name}
            href={`/apps/categories/${category.name}`}
            data-testid={`app-store-category-${category.name}`}
            className="relative flex rounded-md"
            style={{ background: "radial-gradient(farthest-side at top right, #a2abbe 0%, #E3E3E3 100%)" }}>
            <div className="dark:bg-muted light:bg-[url('/noise.svg')] dark:from-subtle dark:to-muted w-full self-center bg-cover bg-center bg-no-repeat px-6 py-4 dark:bg-gradient-to-tr">
              <Image
                src={`/app-categories/${category.name}.svg`}
                width={100}
                height={100}
                alt={category.name}
                className="dark:invert"
              />
              {isLocaleReady ? (
                <h3 className="text-emphasis text-sm font-semibold capitalize">{category.name}</h3>
              ) : (
                <SkeletonText invisible />
              )}
              <p className="text-subtle pt-2 text-sm font-medium">
                {isLocaleReady ? t("number_apps", { count: category.count }) : <SkeletonText invisible />}{" "}
                <Icon name="arrow-right" className="inline-block h-4 w-4" />
              </p>
            </div>
          </Link>
        )}
      />
    </div>
  );
}
