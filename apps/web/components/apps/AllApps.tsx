import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

import AppCard from "./AppCard";

export default function AllApps({ apps }: { apps: App[] }) {
  const { t } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [animationParent] = useAutoAnimate();

  return (
    <div className="mb-16">
      <div className="mb-4 flex flex-col justify-between lg:flex-row lg:items-center">
        <h2 className="text-lg font-semibold text-gray-900 ">{t("explore_all_apps")}</h2>
        <ul className="mt-3 flex max-w-full space-x-1 overflow-x-auto lg:mt-0 lg:max-w-[50%]">
          {apps
            .map((app) => app.category)
            .filter((cat, pos, self) => {
              return self.indexOf(cat) == pos;
            })
            .map((cat, pos) => (
              <li
                key={pos}
                onClick={() => {
                  if (selectedCategory === cat) {
                    setSelectedCategory(null);
                  } else {
                    setSelectedCategory(cat);
                  }
                }}
                className={classNames(
                  selectedCategory === cat ? "bg-gray-200" : "bg-gray-50",
                  "rounded-md px-4 py-2.5 text-sm font-medium text-gray-900 hover:cursor-pointer hover:bg-gray-200"
                )}>
                {cat[0].toUpperCase() + cat.slice(1)}
              </li>
            ))}
        </ul>
      </div>
      <div className="grid-col-1 grid grid-cols-1 gap-3 md:grid-cols-3" ref={animationParent}>
        {apps
          .filter((app) => (selectedCategory !== null ? app.category === selectedCategory : true))
          .map((app) => (
            <AppCard
              key={app.name}
              name={app.name}
              slug={app.slug}
              description={app.description}
              logo={app.logo}
              rating={app.rating}
              reviews={app.reviews}
              isProOnly={app.isProOnly}
            />
          ))}
      </div>
    </div>
  );
}
