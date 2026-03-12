"use client";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useUrlMatchesCurrentUrl } from "@calcom/lib/hooks/useUrlMatchesCurrentUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import { useMediaQuery } from "@coss/ui/hooks/use-media-query";

import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon";

import getAppCategories, { type AppCategoryEntry } from "../_utils/getAppCategories";

type CategoryButtonProps = {
  tab: AppCategoryEntry;
  useQueryParam?: boolean;
};

function CategoryButton({ tab, useQueryParam }: CategoryButtonProps) {
  const urlMatch = useUrlMatchesCurrentUrl(tab.href);
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();

  const isActive = useQueryParam
    ? (searchParams?.get("category") ?? "calendar") === tab.name
    : urlMatch;

  return (
    <Button
      className="justify-start"
      data-pressed={isActive ? true : undefined}
      data-testid={`tab-${tab["data-testid"]}`}
      render={<Link href={tab.href} scroll />}
      variant="ghost">
      {tab.icon && (
        <Icon
          className="max-sm:hidden"
          aria-hidden
          name={tab.icon as IconName}
        />
      )}
      {t(tab.name)}
    </Button>
  );
}

export type AppCategoryNavigationClassNames = {
  contentContainer?: string;
  verticalTabsItem?: string;
};

const AppCategoryNavigation = ({
  baseURL,
  children,
  useQueryParam = false,
  classNames,
}: {
  baseURL: string;
  children: React.ReactNode;
  useQueryParam?: boolean;
  classNames?: AppCategoryNavigationClassNames;
}) => {
  const isSmallScreen = useMediaQuery("max-sm");
  const appCategories = useMemo(
    () => getAppCategories(baseURL, useQueryParam),
    [baseURL, useQueryParam]
  );

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      {isSmallScreen ? (
        <ScrollArea
          scrollbarGutter
        >
          <div className="flex w-max gap-0.5">
            {appCategories.map((tab) => (
              <div className={classNames?.verticalTabsItem} key={tab.href}>
                <CategoryButton tab={tab} useQueryParam={useQueryParam} />
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <nav
          aria-label="App categories"
          className={cn(
            "sticky top-4 flex w-48 shrink-0 flex-col gap-0.5 self-start",
            classNames?.verticalTabsItem
          )}
        >
          {appCategories.map((tab) => (
            <CategoryButton key={tab.href} tab={tab} useQueryParam={useQueryParam} />
          ))}
        </nav>
      )}
      <div className={cn("min-w-0 flex-1", classNames?.contentContainer)}>{children}</div>
    </div>
  );
};

export default AppCategoryNavigation;
