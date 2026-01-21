import Link from "next/link";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import React, { Fragment, useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { sessionStorage } from "@calcom/lib/webstorage";
import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { useShouldDisplayNavigationItem } from "./useShouldDisplayNavigationItem";

const usePersistedExpansionState = (itemName: string) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`nav-expansion-${itemName}`);
    if (stored !== null) {
      setIsExpanded(JSON.parse(stored));
    }
  }, [itemName]);

  const setPersistedExpansion = (expanded: boolean) => {
    setIsExpanded(expanded);
    sessionStorage.setItem(
      `nav-expansion-${itemName}`,
      JSON.stringify(expanded)
    );
  };

  return [isExpanded, setPersistedExpansion] as const;
};

const trackNavigationClick = (itemName: string, parentItemName?: string) => {
  posthog.capture("navigation_item_clicked", {
    item_name: itemName,
    parent_name: parentItemName,
  });
};

export type NavigationItemType = {
  name: string;
  href: string;
  isLoading?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  target?: HTMLAnchorElement["target"];
  badge?: React.ReactNode;
  icon?: IconName;
  child?: NavigationItemType[];
  pro?: true;
  onlyMobile?: boolean;
  onlyDesktop?: boolean;
  moreOnMobile?: boolean;
  isCurrent?: ({
    item,
    isChild,
    pathname,
  }: {
    item: Pick<NavigationItemType, "href">;
    isChild?: boolean;
    pathname: string | null;
  }) => boolean;
};

const defaultIsCurrent: NavigationItemType["isCurrent"] = ({
  isChild,
  item,
  pathname,
}) => {
  return isChild
    ? item.href === pathname
    : item.href
      ? pathname?.startsWith(item.href) ?? false
      : false;
};



const NavigationIconContainer: React.FC<{
  item: NavigationItemType;
  current: boolean;
}> = ({ item, current }) => {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center md:mx-auto lg:mx-0 lg:mr-2">
      {item.icon && (
        <Icon
          name={item.isLoading ? "rotate-cw" : item.icon}
          className={classNames(
            "todesktop:!text-blue-500 h-4 w-4 shrink-0",
            item.isLoading && "animate-spin"
          )}
          aria-hidden="true"
          aria-current={current ? "page" : undefined}
        />
      )}
    </span>
  );
};



const NavigationTrailingElement: React.FC<{
  hasChildren: boolean;
  isExpanded: boolean;
  shouldShowChevron: boolean;
}> = ({ hasChildren, isExpanded, shouldShowChevron }) => {
  if (!hasChildren || !shouldShowChevron) return null;


  const iconName = isExpanded ? "chevron-up" : "chevron-down";


  return (
    <Fragment>
      <Icon
        name={iconName}
        className="absolute right-1 top-1/2 h-2 w-2 -translate-y-1/2 opacity-70 lg:hidden"
        aria-hidden="true"
      />
      <Icon
        name={iconName}
        className="hidden h-4 w-4 lg:block"
        aria-hidden="true"
      />
    </Fragment>
  );
};


export const NavigationItem: React.FC<{
  index?: number;
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item, isChild } = props;
  const { t, isLocaleReady } = useLocale();
  const pathname = usePathname();
  const isCurrent: NavigationItemType["isCurrent"] =
    item.isCurrent || defaultIsCurrent;
  const current = isCurrent({ isChild: !!isChild, item, pathname });
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(
    props.item
  );
  const [isExpanded, setIsExpanded] = usePersistedExpansionState(item.name);

  const isTablet = useMediaQuery("(max-width: 1024px)");
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  if (!shouldDisplayNavigationItem) return null;

  const hasChildren = !!(item.child && item.child.length > 0);
  const hasActiveChild =
    hasChildren &&
    item.child?.some((child) =>
      isCurrent({ isChild: true, item: child, pathname })
    );
  const shouldShowChildren =
    isExpanded || hasActiveChild || isCurrent({ pathname, isChild, item });
  const shouldShowChevron = !!(hasChildren && !hasActiveChild);
  const isParentNavigationItem = hasChildren && !isChild;


  const commonClasses = classNames(
    "relative",
    "todesktop:py-[7px] text-default group flex items-center rounded-md transition",
    isLocaleReady ? "hover:bg-subtle todesktop:[&[aria-current='page']]:bg-emphasis todesktop:hover:bg-transparent hover:text-emphasis" : ""
  );


  return (
    <Fragment>
      {isParentNavigationItem ? (
        <Tooltip
          side="right"
          open={isTooltipOpen}
          content={
            <div className="stack-y-1 pointer-events-auto flex flex-col p-1">
              <span className="text-subtle px-2 text-xs font-semibold uppercase tracking-wide">{t(item.name)}</span>
              <div className="flex flex-col gap-1">
                {item.child?.map((childItem) => (
                  <Link
                    key={childItem.name}
                    href={childItem.href}
                    onClick={() => { setIsTooltipOpen(false); trackNavigationClick(childItem.name, item.name); }}
                    className={classNames(
                      "group relative block rounded-md px-3 py-1 text-sm font-medium",
                      (childItem.isCurrent || defaultIsCurrent)({ isChild: true, item: childItem, pathname })
                        ? "bg-emphasis text-white"
                        : "hover:bg-emphasis text-mute hover:text-emphasis"
                    )}
                  >
                    {t(childItem.name)}
                  </Link>
                ))}
              </div>
            </div>
          }
          className="lg:hidden"
        >
          <button
            onClick={() => { setIsExpanded(!isExpanded); if (isTablet) setIsTooltipOpen(!isTooltipOpen); }}
            className={classNames(
              commonClasses,
              "w-full px-2 py-1.5 mt-0.5 text-sm font-medium",
              "aria-[aria-current='page']:bg-transparent!",
              "[&[aria-current='page']]:text-emphasis"
            )}
            aria-current={current ? "page" : undefined}
          >
            <NavigationIconContainer item={item} current={current} />
            <span className="hidden w-full justify-between truncate text-ellipsis lg:flex">
              {t(item.name)}
              {item.badge && item.badge}
            </span>
            <NavigationTrailingElement
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              shouldShowChevron={shouldShowChevron}
            />
          </button>
        </Tooltip>
      ) : (
        <Tooltip side="right" content={t(item.name)} className="lg:hidden">
          <Link
            href={item.href}
            onClick={() => trackNavigationClick(item.name)}
            className={classNames(
              commonClasses,
              item.child ? "aria-[aria-current='page']:bg-transparent!" : "[&[aria-current='page']]:bg-emphasis",
              isChild
                ? `hidden h-8 pl-11 lg:flex text-sm font-normal ${props.index === 0 ? "mt-0" : "mt-1 hover:mt-1 [&[aria-current='page']]:mt-1"}`
                : "px-2 py-1.5 mt-0.5 text-sm font-medium [&[aria-current='page']]:text-emphasis"
            )}
            aria-current={current ? "page" : undefined}
          >
            {!isChild && <NavigationIconContainer item={item} current={current} />}
            <span className={classNames("hidden truncate text-ellipsis lg:flex", !isChild && "w-full justify-between")}>
              {t(item.name)}
              {!isChild && item.badge && item.badge}
            </span>
            <NavigationTrailingElement
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              shouldShowChevron={shouldShowChevron}
            />
          </Link>
        </Tooltip>
      )}
      {item.child && shouldShowChildren && item.child.map((child, index) => (
        <NavigationItem index={index} key={child.name} item={child} isChild />
      ))}
    </Fragment>
  );
};


export const MobileNavigationItem: React.FC<{ item: NavigationItemType; isChild?: boolean; }> = (props) => {
  const { item, isChild } = props;
  const pathname = usePathname();
  const { t, isLocaleReady } = useLocale();
  const current = (item.isCurrent || defaultIsCurrent)({ isChild: !!isChild, item, pathname });
  if (!useShouldDisplayNavigationItem(props.item)) return null;
  return (
    <Link
      href={item.href}
      className="[&[aria-current='page']]:text-emphasis hover:text-default text-muted bg-transparent! relative my-2 min-w-0 flex-1 overflow-hidden rounded-md p-1 text-center text-xs font-medium focus:z-10 sm:text-sm"
      aria-current={current ? "page" : undefined}
    >
      {item.badge && <div className="absolute right-1 top-1">{item.badge}</div>}
      {item.icon && (
        <Icon
          name={item.icon}
          className="[&[aria-current='page']]:text-emphasis mx-auto mb-1 block h-5 w-5 shrink-0 text-center text-inherit"
          aria-hidden="true" />
      )}
      {isLocaleReady ? (
        <span className="block truncate">{t(item.name)}</span>
      ) : (
        <SkeletonText />
      )}
    </Link>
  );
};

export const MobileNavigationMoreItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item } = props;
  const { t, isLocaleReady } = useLocale();
  const [isExpanded, setIsExpanded] = usePersistedExpansionState(item.name);
  if (!useShouldDisplayNavigationItem(props.item)) return null;
  const hasChildren = !!(item.child && item.child.length > 0);
  return (
    <li className="border-subtle border-b last:border-b-0" key={item.name}>
      {hasChildren ? (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-subtle flex w-full items-center justify-between p-5 text-left transition"
          >
            <span className="text-default flex items-center font-semibold">
              {item.icon && (
                <Icon
                  name={item.icon}
                  className="h-5 w-5 shrink-0 ltr:mr-3 rtl:ml-3"
                  aria-hidden="true"
                />
              )}
              {isLocaleReady ? t(item.name) : <SkeletonText />}
            </span>
            <Icon
              name={isExpanded ? "chevron-up" : "chevron-down"}
              className="text-subtle h-5 w-5"
            />
          </button>
          {isExpanded && item.child && (
            <ul className="bg-subtle">
              {item.child.map((childItem) => (
                <li key={childItem.name} className="border-subtle border-t">
                  <Link
                    href={childItem.href}
                    className="hover:bg-cal-muted flex items-center p-4 pl-12 transition"
                  >
                    <span className="text-default font-medium">
                      {isLocaleReady ? t(childItem.name) : <SkeletonText />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <Link
          href={item.href}
          className="hover:bg-subtle flex items-center justify-between p-5 transition"
        >
          <span className="text-default flex items-center font-semibold ">
            {item.icon && (
              <Icon
                name={item.icon}
                className="h-5 w-5 shrink-0 ltr:mr-3 rtl:ml-3"
                aria-hidden="true"
              />
            )}
            {isLocaleReady ? t(item.name) : <SkeletonText />}
          </span>
          <Icon name="arrow-right" className="text-subtle h-5 w-5" />
        </Link>
      )}
    </li>
  );
};