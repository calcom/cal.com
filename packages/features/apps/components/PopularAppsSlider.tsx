import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import { AppCard } from "./AppCard";
import { Slider } from "./Slider";

export const PopularAppsSlider = <T extends App>({ items }: { items: T[] }) => {
  const { t } = useLocale();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sortedItems = items.sort((a, b) => (b.installCount || 0) - (a.installCount || 0));

  if (!isClient) {
    return (
      <div className="mb-2">
        <div className="flex cursor-default items-center pb-3">
          <div>
            <h2 className="text-emphasis mt-0 text-base font-semibold leading-none">{t("most_popular")}</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sortedItems.slice(0, 3).map((app) => (
            <div key={app.name} className="border-subtle relative flex h-64 flex-col rounded-md border p-5">
              <div className="flex">
                <div className="bg-subtle mb-4 h-12 w-12 rounded-sm" />
              </div>
              <div className="flex items-center">
                <SkeletonText className="h-5 w-32" />
              </div>
              <div className="mt-2 flex-grow">
                <SkeletonText className="mb-2 h-4 w-full" />
                <SkeletonText className="mb-2 h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Slider<T>
      title={t("most_popular")}
      items={sortedItems}
      itemKey={(app) => app.name}
      options={{
        perView: 3,
        breakpoints: {
          768 /* and below */: {
            perView: 1,
          },
        },
      }}
      renderItem={(app) => <AppCard app={app} />}
    />
  );
};
