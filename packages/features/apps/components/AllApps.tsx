"use client";

import type { AppCategories } from "@prisma/client";
import { useEffect, useRef, useState, memo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import { AppCard } from "./AppCard";
import { CategoryTab } from "./CategoryTab";

const AllAppsComponent = ({ apps, searchText, categories, userAdminTeams }: AllAppsPropsType) => {
  const { t } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const appsContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      setIsClient(true);
      isFirstRender.current = false;
    }
  }, []);

  const handleCategoryChange = (category: string | null) => {
    const validCategory =
      category && typeof category === "string" && categories.includes(category) ? category : null;
    setSelectedCategory(validCategory);
  };

  const filteredApps = apps
    .filter((app) =>
      selectedCategory !== null
        ? app.categories
          ? app.categories.includes(selectedCategory as AppCategories)
          : app.category === selectedCategory
        : true
    )
    .filter((app) => (searchText ? app.name.toLowerCase().includes(searchText.toLowerCase()) : true))
    .sort(function (a, b) {
      if (a.name < b.name) return -1;
      else if (a.name > b.name) return 1;
      return 0;
    });

  if (!isClient) {
    return (
      <div>
        <div className="relative mb-4 flex flex-col justify-between lg:flex-row lg:items-center">
          <h2 className="text-emphasis hidden text-base font-semibold leading-none sm:block">
            {searchText ? t("search") : t("category_apps", { category: t("all") })}
          </h2>
          <ul className="no-scrollbar mt-3 flex max-w-full space-x-1 overflow-x-auto lg:mt-0 lg:max-w-[50%]">
            <li className="bg-emphasis text-default min-w-max rounded-md px-4 py-2.5 text-sm font-medium">
              {t("all")}
            </li>
          </ul>
        </div>
        <div className="grid gap-3 lg:grid-cols-4 [@media(max-width:1270px)]:grid-cols-3 [@media(max-width:500px)]:grid-cols-1 [@media(max-width:730px)]:grid-cols-1">
          {/* Skeleton placeholders */}
          {[...Array(8)].map((_, index) => (
            <div key={index} className="border-subtle relative flex h-64 flex-col rounded-md border p-5">
              <div className="flex">
                <div className="bg-subtle mb-4 h-12 w-12 rounded-sm" />
              </div>
              <div className="flex items-center">
                <div className="bg-subtle h-5 w-32 rounded-md" />
              </div>
              <div className="mt-2 flex-grow">
                <div className="bg-subtle mb-2 h-4 w-full rounded-md" />
                <div className="bg-subtle mb-2 h-4 w-3/4 rounded-md" />
              </div>
              <div className="mt-5 flex max-w-full flex-row justify-between gap-2">
                <div className="bg-subtle flex w-32 flex-grow justify-center rounded-md py-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Only render CategoryTab on client-side to prevent hydration mismatches */}
      <CategoryTab
        selectedCategory={selectedCategory}
        searchText={searchText}
        categories={categories}
        onCategoryChange={handleCategoryChange}
      />
      {filteredApps.length ? (
        <div
          className="grid gap-3 lg:grid-cols-4 [@media(max-width:1270px)]:grid-cols-3 [@media(max-width:500px)]:grid-cols-1 [@media(max-width:730px)]:grid-cols-1"
          ref={appsContainerRef}>
          {filteredApps.map((app) => (
            <AppCard
              key={app.name}
              app={app}
              searchText={searchText}
              credentials={app.credentials}
              userAdminTeams={userAdminTeams}
            />
          ))}
        </div>
      ) : (
        <EmptyScreen
          Icon="search"
          headline={t("no_results")}
          description={searchText ? searchText?.toString() : ""}
        />
      )}
    </div>
  );
};

export const AllApps = memo(AllAppsComponent);
