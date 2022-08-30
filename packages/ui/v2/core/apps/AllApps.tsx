import { useAutoAnimate } from "@formkit/auto-animate/react";
import { UIEvent, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "react-feather";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

import AppCard from "./AppCard";

export default function AllAppsV2({ apps }: { apps: App[] }) {
  const { t } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [appsContainerRef] = useAutoAnimate<HTMLDivElement>();
  const appCategoriesListRef = useRef<HTMLUListElement>(null);
  const [appCategoriesShowArrowScroll, setAppCategoriesShowArrowScroll] = useState({
    left: false,
    right: false,
  });

  useLayoutEffect(() => {
    const appCategoryList = appCategoriesListRef.current;
    if (appCategoryList && appCategoryList.scrollWidth > appCategoryList.clientWidth) {
      setAppCategoriesShowArrowScroll({ left: false, right: true });
    }
  }, []);

  const calculateScroll = (e: UIEvent<HTMLUListElement>) => {
    setAppCategoriesShowArrowScroll({
      left: e.currentTarget.scrollLeft > 0,
      right:
        Math.floor(e.currentTarget.scrollWidth) - Math.floor(e.currentTarget.offsetWidth) !==
        Math.floor(e.currentTarget.scrollLeft),
    });
  };

  return (
    <div className="mb-16">
      <div className="mb-4 flex flex-col justify-between lg:flex-row lg:items-center">
        <h2 className="text-lg font-semibold text-gray-900 ">{t("explore_all_apps")}</h2>
        {appCategoriesShowArrowScroll.left && (
          <div className="absolute left-1/2 flex">
            <div className="flex h-12 w-5 items-center justify-end bg-white">
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex h-12 w-5 bg-gradient-to-l from-transparent to-white" />
          </div>
        )}
        <ul
          className="no-scrollbar mt-3 flex max-w-full space-x-1 overflow-x-auto lg:mt-0 lg:max-w-[50%]"
          onScroll={(e) => calculateScroll(e)}
          ref={appCategoriesListRef}>
          <li
            onClick={() => {
              setSelectedCategory(null);
            }}
            className={classNames(
              selectedCategory === null ? "bg-gray-200" : "bg-gray-50",
              "rounded-md px-4 py-2.5 text-sm font-medium text-gray-900 hover:cursor-pointer hover:bg-gray-200"
            )}>
            {t("all_apps")}
          </li>
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
        {appCategoriesShowArrowScroll.right && (
          <div className="absolute right-12 flex">
            <div className="flex h-12 w-5 bg-gradient-to-r from-transparent to-white" />
            <div className="flex h-12 w-5 items-center justify-end bg-white">
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" ref={appsContainerRef}>
        {apps
          .filter((app) => (selectedCategory !== null ? app.category === selectedCategory : true))
          .map((app) => (
            <AppCard key={app.name} app={app} />
          ))}
      </div>
    </div>
  );
}
