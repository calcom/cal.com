import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { AppCategories } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import type { UIEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { classNames } from "@calcom/lib";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";

import { Icon } from "../..";
import { EmptyScreen } from "../empty-screen";
import { AppCard } from "./AppCard";

export function useShouldShowArrows() {
  const ref = useRef<HTMLUListElement>(null);
  const [showArrowScroll, setShowArrowScroll] = useState({
    left: false,
    right: false,
  });

  useEffect(() => {
    const appCategoryList = ref.current;
    if (appCategoryList && appCategoryList.scrollWidth > appCategoryList.clientWidth) {
      setShowArrowScroll({ left: false, right: true });
    }
  }, []);

  const calculateScroll = (e: UIEvent<HTMLUListElement>) => {
    setShowArrowScroll({
      left: e.currentTarget.scrollLeft > 0,
      right:
        Math.floor(e.currentTarget.scrollWidth) - Math.floor(e.currentTarget.offsetWidth) !==
        Math.floor(e.currentTarget.scrollLeft),
    });
  };

  return { ref, calculateScroll, leftVisible: showArrowScroll.left, rightVisible: showArrowScroll.right };
}

type AllAppsPropsType = {
  apps: (App & { credentials?: Credential[] })[];
  searchText?: string;
  categories: string[];
  userAdminTeams?: UserAdminTeams;
};

interface CategoryTabProps {
  selectedCategory: string | null;
  categories: string[];
  searchText?: string;
}

function CategoryTab({ selectedCategory, categories, searchText }: CategoryTabProps) {
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const router = useRouter();
  const { ref, calculateScroll, leftVisible, rightVisible } = useShouldShowArrows();
  const handleLeft = () => {
    if (ref.current) {
      ref.current.scrollLeft -= 100;
    }
  };

  const handleRight = () => {
    if (ref.current) {
      ref.current.scrollLeft += 100;
    }
  };
  return (
    <div className="relative mb-4 flex flex-col justify-between lg:flex-row lg:items-center">
      <h2 className="text-emphasis hidden text-base font-semibold leading-none sm:block">
        {searchText
          ? t("search")
          : t("category_apps", {
              category:
                (selectedCategory && selectedCategory[0].toUpperCase() + selectedCategory.slice(1)) ||
                t("all"),
            })}
      </h2>
      {leftVisible && (
        <button onClick={handleLeft} className="absolute bottom-0 flex md:-top-1 md:left-1/2">
          <div className="bg-default flex h-12 w-5 items-center justify-end">
            <Icon name="chevron-left" className="text-subtle h-4 w-4" />
          </div>
          <div className="to-default flex h-12 w-5 bg-gradient-to-l from-transparent" />
        </button>
      )}
      <ul
        className="no-scrollbar mt-3 flex max-w-full space-x-1 overflow-x-auto lg:mt-0 lg:max-w-[50%]"
        onScroll={(e) => calculateScroll(e)}
        ref={ref}>
        <li
          onClick={() => {
            if (pathname !== null) {
              router.replace(pathname);
            }
          }}
          className={classNames(
            selectedCategory === null ? "bg-emphasis text-default" : "bg-muted text-emphasis",
            "hover:bg-emphasis min-w-max rounded-md px-4 py-2.5 text-sm font-medium hover:cursor-pointer"
          )}>
          {t("all")}
        </li>
        {categories.map((cat, pos) => (
          <li
            key={pos}
            onClick={() => {
              if (selectedCategory === cat) {
                if (pathname !== null) {
                  router.replace(pathname);
                }
              } else {
                const _searchParams = new URLSearchParams(searchParams ?? undefined);
                _searchParams.set("category", cat);
                router.replace(`${pathname}?${_searchParams.toString()}`);
              }
            }}
            className={classNames(
              selectedCategory === cat ? "bg-emphasis text-default" : "bg-muted text-emphasis",
              "hover:bg-emphasis rounded-md px-4 py-2.5 text-sm font-medium hover:cursor-pointer"
            )}>
            {cat[0].toUpperCase() + cat.slice(1)}
          </li>
        ))}
      </ul>
      {rightVisible && (
        <button onClick={handleRight} className="absolute bottom-0 right-0 flex md:-top-1">
          <div className="to-default flex h-12 w-5 bg-gradient-to-r from-transparent" />
          <div className="bg-default flex h-12 w-5 items-center justify-end">
            <Icon name="chevron-right" className="text-subtle h-4 w-4" />
          </div>
        </button>
      )}
    </div>
  );
}

export function AllApps({ apps, searchText, categories, userAdminTeams }: AllAppsPropsType) {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [appsContainerRef, enableAnimation] = useAutoAnimate<HTMLDivElement>();
  const categoryQuery = searchParams?.get("category");

  if (searchText) {
    enableAnimation && enableAnimation(false);
  }

  useEffect(() => {
    const queryCategory =
      typeof categoryQuery === "string" && categories.includes(categoryQuery) ? categoryQuery : null;
    setSelectedCategory(queryCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryQuery]);

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

  return (
    <div>
      <CategoryTab selectedCategory={selectedCategory} searchText={searchText} categories={categories} />
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
          ))}{" "}
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
}
