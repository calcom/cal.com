import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Credential } from "@prisma/client";
import { useRouter } from "next/router";
import { UIEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "react-feather";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

import AppCard from "./AppCard";

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

type AllAppsPropsType = { apps: (App & { credentials: Credential[] | undefined })[] };

interface CategoryTabProps {
  selectedCategory: string | null;
  categories: string[];
}

function CategoryTab({ selectedCategory, categories }: CategoryTabProps) {
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
      <h2 className="text-lg font-semibold text-gray-900 ">
        {t("explore_apps", {
          category:
            (selectedCategory && selectedCategory[0].toUpperCase() + selectedCategory.slice(1)) ||
            t("all_apps"),
        })}
      </h2>
      {leftVisible && (
        <button onClick={handleLeft} className="absolute top-9 flex md:left-1/2 md:-top-1">
          <div className="flex h-12 w-5 items-center justify-end bg-white">
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex h-12 w-5 bg-gradient-to-l from-transparent to-white" />
        </button>
      )}
      <ul
        className="no-scrollbar mt-3 flex max-w-full space-x-1 overflow-x-auto lg:mt-0 lg:max-w-[50%]"
        onScroll={(e) => calculateScroll(e)}
        ref={ref}>
        <li
          onClick={() => {
            router.replace(router.asPath.split("?")[0], undefined, { shallow: true });
          }}
          className={classNames(
            selectedCategory === null ? "bg-gray-900 text-gray-50" : "bg-gray-50 text-gray-900",
            "rounded-md px-4 py-2.5 text-sm font-medium hover:cursor-pointer hover:bg-gray-900 hover:text-gray-50"
          )}>
          {t("all_apps")}
        </li>
        {categories.map((cat, pos) => (
          <li
            key={pos}
            onClick={() => {
              if (selectedCategory === cat) {
                router.replace(router.asPath.split("?")[0], undefined, { shallow: true });
              } else {
                router.replace(router.asPath.split("?")[0] + `?category=${cat}`, undefined, {
                  shallow: true,
                });
              }
            }}
            className={classNames(
              selectedCategory === cat ? "bg-gray-900 text-gray-50" : "bg-gray-50 text-gray-900",
              "rounded-md px-4 py-2.5 text-sm font-medium hover:cursor-pointer hover:bg-gray-900 hover:text-gray-50"
            )}>
            {cat[0].toUpperCase() + cat.slice(1)}
          </li>
        ))}
      </ul>
      {rightVisible && (
        <button onClick={handleRight} className="absolute top-9 right-0 flex md:-top-1">
          <div className="flex h-12 w-5 bg-gradient-to-r from-transparent to-white" />
          <div className="flex h-12 w-5 items-center justify-end bg-white">
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </div>
        </button>
      )}
    </div>
  );
}

export default function AllApps({ apps }: AllAppsPropsType) {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [appsContainerRef] = useAutoAnimate<HTMLDivElement>();

  const categories = apps
    .map((app) => app.category)
    .filter((cat, pos, self) => {
      return self.indexOf(cat) === pos;
    });

  useEffect(() => {
    const queryCategory =
      typeof router.query.category === "string" && categories.includes(router.query.category)
        ? router.query.category
        : null;
    setSelectedCategory(queryCategory);
  }, [router.query.category]);

  return (
    <div className="mb-16">
      <CategoryTab selectedCategory={selectedCategory} categories={categories} />
      <div
        className="grid gap-3 lg:grid-cols-4 [@media(max-width:1270px)]:grid-cols-3 [@media(max-width:730px)]:grid-cols-2 [@media(max-width:500px)]:grid-cols-1"
        ref={appsContainerRef}>
        {apps
          .filter((app) =>
            selectedCategory !== null
              ? app.categories
                ? app.categories.includes(selectedCategory)
                : app.category === selectedCategory
              : true
          )
          .map((app) => (
            <AppCard key={app.name} app={app} credentials={app.credentials} />
          ))}
      </div>
    </div>
  );
}
