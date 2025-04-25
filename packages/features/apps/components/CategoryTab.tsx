"use client";

import type { UIEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";

export function useShouldShowArrows() {
  const ref = useRef<HTMLUListElement>(null);
  const [showArrowScroll, setShowArrowScroll] = useState({
    left: false,
    right: false,
  });

  useEffect(() => {
    const appCategoryList = ref.current;
    if (appCategoryList) {
      const isAtStart = appCategoryList.scrollLeft <= 0;
      const isAtEnd = appCategoryList.scrollWidth <= appCategoryList.clientWidth + appCategoryList.scrollLeft;
      setShowArrowScroll({
        left: !isAtStart,
        right: !isAtEnd,
      });
    }
  }, [ref.current?.scrollWidth, ref.current?.clientWidth]);

  const calculateScroll = (e: UIEvent<HTMLUListElement>) => {
    const target = e.currentTarget;
    const isAtEnd = target.scrollWidth <= target.clientWidth + target.scrollLeft + 1;
    setShowArrowScroll({
      left: target.scrollLeft > 0,
      right: !isAtEnd,
    });
  };

  return { ref, calculateScroll, leftVisible: showArrowScroll.left, rightVisible: showArrowScroll.right };
}

export interface CategoryTabProps {
  selectedCategory: string | null;
  categories: string[];
  searchText?: string;
  onCategoryChange: (category: string | null) => void;
}

export function CategoryTab({
  selectedCategory,
  categories,
  searchText,
  onCategoryChange,
}: CategoryTabProps) {
  const { t } = useLocale();
  const { ref, calculateScroll, leftVisible, rightVisible } = useShouldShowArrows();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
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
    );
  }

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
        <button onClick={handleLeft} className="absolute bottom-0 flex lg:left-1/2">
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
            onCategoryChange(null);
          }}
          className={classNames(
            selectedCategory === null ? "bg-emphasis text-default" : "bg-muted text-emphasis",
            "hover:bg-emphasis min-w-max rounded-md px-4 py-2.5 text-sm font-medium transition hover:cursor-pointer"
          )}>
          {t("all")}
        </li>
        {categories.map((cat, pos) => (
          <li
            key={pos}
            onClick={() => {
              if (selectedCategory === cat) {
                onCategoryChange(null);
              } else {
                onCategoryChange(cat);
              }
            }}
            className={classNames(
              selectedCategory === cat ? "bg-emphasis text-default" : "bg-muted text-emphasis",
              "hover:bg-emphasis rounded-md px-4 py-2.5 text-sm font-medium transition hover:cursor-pointer"
            )}>
            {cat[0].toUpperCase() + cat.slice(1)}
          </li>
        ))}
      </ul>
      {rightVisible && (
        <button onClick={handleRight} className="absolute bottom-0 right-0 flex">
          <div className="to-default flex h-12 w-5 bg-gradient-to-r from-transparent" />
          <div className="bg-default flex h-12 w-5 items-center justify-end">
            <Icon name="chevron-right" className="text-subtle h-4 w-4" />
          </div>
        </button>
      )}
    </div>
  );
}
