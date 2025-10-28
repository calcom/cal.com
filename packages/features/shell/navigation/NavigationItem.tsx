import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, { Fragment, useState, useEffect, useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { sessionStorage } from "@calcom/lib/webstorage";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
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
    sessionStorage.setItem(`nav-expansion-${itemName}`, JSON.stringify(expanded));
  };

  return [isExpanded, setPersistedExpansion] as const;
};

const useBuildHref = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    prevPathnameRef.current = pathname;
  }, [pathname]);

  const buildHref = (childItem: NavigationItemType) => {
    if (
      childItem.preserveQueryParams &&
      childItem.preserveQueryParams({ prevPathname: prevPathnameRef.current, nextPathname: childItem.href })
    ) {
      const params = searchParams.toString();
      return params ? `${childItem.href}?${params}` : childItem.href;
    }
    return childItem.href;
  };

  return buildHref;
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
  preserveQueryParams?: (context: { prevPathname: string | null; nextPathname: string }) => boolean;
};

function usePersistedExpansionState(itemName: string) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`nav-expansion-${itemName}`);
    if (stored !== null) {
      setIsExpanded(JSON.parse(stored));
    }
  }, [itemName]);

  const setPersistedExpansion = (expanded: boolean) => {
    setIsExpanded(expanded);
    sessionStorage.setItem(`nav-expansion-${itemName}`, JSON.stringify(expanded));
  };

  return [isExpanded, setPersistedExpansion] as const;
}

function useBuildHref() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    prevPathnameRef.current = pathname;
  }, [pathname]);

  const buildHref = (childItem: NavigationItemType) => {
    if (
      childItem.preserveQueryParams &&
      childItem.preserveQueryParams({ prevPathname: prevPathnameRef.current ?? pathname })
    ) {
      const params = searchParams.toString();
      return params ? `${childItem.href}?${params}` : childItem.href;
    }
    return childItem.href;
  };

  return buildHref;
}

const defaultIsCurrent: NavigationItemType["isCurrent"] = ({ isChild, item, pathname }) => {
  return isChild ? item.href === pathname : item.href ? pathname?.startsWith(item.href) ?? false : false;
};

function getNavigationItemClasses(isChild: boolean, index: number, isLocaleReady: boolean) {
  const baseClasses =
    "todesktop:py-[7px] text-default group flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition";

  const currentPageClasses = isChild
    ? "[&[aria-current='page']]:text-emphasis [&[aria-current='page']]:bg-emphasis"
    : "[&[aria-current='page']]:bg-emphasis";

  const childSpecificClasses = isChild
    ? `hidden h-8 pl-16 lg:flex lg:pl-11 ${index === 0 ? "mt-0" : "mt-px"}`
    : "mt-0.5 text-sm";

  const hoverClasses = isLocaleReady
    ? "hover:bg-subtle todesktop:[&[aria-current='page']]:bg-emphasis todesktop:hover:bg-transparent hover:text-emphasis"
    : "";

  return classNames(baseClasses, currentPageClasses, childSpecificClasses, hoverClasses);
}

function getParentNavigationItemClasses(isLocaleReady: boolean) {
  return classNames(
    "todesktop:py-[7px] text-default group flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium transition",
    "[&[aria-current='page']]:!bg-transparent",
    "[&[aria-current='page']]:text-emphasis mt-0.5 text-sm",
    isLocaleReady
      ? "hover:bg-subtle todesktop:[&[aria-current='page']]:bg-emphasis todesktop:hover:bg-transparent hover:text-emphasis"
      : ""
  );
}

function NavigationItemIcon({
  icon,
  isLoading,
  current,
}: {
  icon?: IconName;
  isLoading?: boolean;
  current?: boolean;
}) {
  if (!icon) return null;

  return (
    <Icon
      name={isLoading ? "rotate-cw" : icon}
      className={classNames(
        "todesktop:!text-blue-500 mr-2 h-4 w-4 flex-shrink-0 rtl:ml-2 md:ltr:mx-auto lg:ltr:mr-2",
        current && "[&[aria-current='page']]:text-inherit",
        isLoading && "animate-spin"
      )}
      aria-hidden="true"
      aria-current={current ? "page" : undefined}
    />
  );
}

function NavigationItemLabel({
  name,
  badge,
  isLocaleReady,
}: {
  name: string;
  badge?: React.ReactNode;
  isLocaleReady: boolean;
}) {
  const { t } = useLocale();

  if (!isLocaleReady) {
    return <SkeletonText className="h-[20px] w-full" />;
  }

  return (
    <span
      className="hidden w-full justify-between truncate text-ellipsis lg:flex"
      data-testid={`${name}-test`}>
      {t(name)}
      {badge}
    </span>
  );
}

function TooltipChildrenList({
  children,
  parentName,
  buildHref,
  pathname,
  onLinkClick,
}: {
  children: NavigationItemType[];
  parentName: string;
  buildHref: (item: NavigationItemType) => string;
  pathname: string | null;
  onLinkClick: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="pointer-events-auto flex flex-col space-y-1 p-1">
      <span className="text-subtle px-2 text-xs font-semibold uppercase tracking-wide">{t(parentName)}</span>
      <div className="flex flex-col">
        {children.map((childItem) => {
          const childIsCurrent =
            typeof childItem.isCurrent === "function"
              ? childItem.isCurrent({ isChild: true, item: childItem, pathname })
              : defaultIsCurrent({ isChild: true, item: childItem, pathname });

          return (
            <Link
              key={childItem.name}
              href={buildHref(childItem)}
              aria-current={childIsCurrent ? "page" : undefined}
              onClick={onLinkClick}
              className={classNames(
                "group relative block rounded-md px-3 py-1 text-sm font-medium",
                childIsCurrent ? "bg-emphasis text-white" : "hover:bg-emphasis text-mute hover:text-emphasis"
              )}>
              {t(childItem.name)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ParentNavigationItem({
  item,
  isExpanded,
  isTooltipOpen,
  current,
  shouldShowChevron,
  isLocaleReady,
  onToggle,
  pathname,
  buildHref,
}: {
  item: NavigationItemType;
  isExpanded: boolean;
  isTooltipOpen: boolean;
  current: boolean;
  shouldShowChevron: boolean;
  isLocaleReady: boolean;
  onToggle: () => void;
  pathname: string | null;
  buildHref: (item: NavigationItemType) => string;
}) {
  const { t } = useLocale();
  const hasChildren = item.child && item.child.length > 0;

  const tooltipContent = hasChildren ? (
    <TooltipChildrenList
      children={item.child!}
      parentName={item.name}
      buildHref={buildHref}
      pathname={pathname}
      onLinkClick={() => {}}
    />
  ) : (
    t(item.name)
  );

  return (
    <Tooltip side="right" open={isTooltipOpen} content={tooltipContent} className="lg:hidden">
      <button
        data-test-id={item.name}
        aria-label={t(item.name)}
        aria-expanded={isExpanded}
        aria-current={current ? "page" : undefined}
        onClick={onToggle}
        className={getParentNavigationItemClasses(isLocaleReady)}>
        <NavigationItemIcon icon={item.icon} isLoading={item.isLoading} />
        <NavigationItemLabel name={item.name} badge={item.badge} isLocaleReady={isLocaleReady} />
        {shouldShowChevron && (
          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="ml-auto h-4 w-4" />
        )}
      </button>
    </Tooltip>
  );
}

function ChildOrSimpleNavigationItem({
  item,
  isChild,
  index,
  current,
  isLocaleReady,
  buildHref,
}: {
  item: NavigationItemType;
  isChild: boolean;
  index: number;
  current: boolean;
  isLocaleReady: boolean;
  buildHref: (item: NavigationItemType) => string;
}) {
  const { t } = useLocale();

  return (
    <Tooltip side="right" content={t(item.name)} className="lg:hidden">
      <Link
        data-test-id={item.name}
        href={isChild ? buildHref(item) : item.href}
        aria-label={t(item.name)}
        target={item.target}
        className={classNames(
          getNavigationItemClasses(isChild, index, isLocaleReady),
          item.child ? `[&[aria-current='page']]:!bg-transparent` : ""
        )}
        aria-current={current ? "page" : undefined}>
        <NavigationItemIcon icon={item.icon} isLoading={item.isLoading} current={current} />
        <NavigationItemLabel name={item.name} badge={item.badge} isLocaleReady={isLocaleReady} />
        {item.name === "workflows" && (
          <Badge startIcon="sparkles" variant="purple">
            Cal.ai
          </Badge>
        )}
      </Link>
    </Tooltip>
  );
}

export const NavigationItem: React.FC<{
  index?: number;
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item, isChild = false } = props;
  const { isLocaleReady } = useLocale();
  const pathname = usePathname();
  const isCurrent: NavigationItemType["isCurrent"] = item.isCurrent || defaultIsCurrent;
  const current = isCurrent({ isChild, item, pathname });
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(item);
  const [isExpanded, setIsExpanded] = usePersistedExpansionState(item.name);
  const buildHref = useBuildHref();
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  if (!shouldDisplayNavigationItem) return null;

  const hasChildren = item.child && item.child.length > 0;
  const hasActiveChild =
    hasChildren && item.child?.some((child) => isCurrent({ isChild: true, item: child, pathname }));
  const shouldShowChildren = isExpanded || hasActiveChild || current;
  const shouldShowChevron = hasChildren && !hasActiveChild;
  const isParentNavigationItem = hasChildren && !isChild;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (isTablet && hasChildren) {
      setIsTooltipOpen(!isTooltipOpen);
    }
  };

  return (
    <Fragment>
      {isParentNavigationItem ? (
        <ParentNavigationItem
          item={item}
          isExpanded={isExpanded}
          isTooltipOpen={isTooltipOpen}
          current={current}
          shouldShowChevron={shouldShowChevron}
          isLocaleReady={isLocaleReady}
          onToggle={handleToggle}
          pathname={pathname}
          buildHref={buildHref}
        />
      ) : (
        <ChildOrSimpleNavigationItem
          item={item}
          isChild={isChild}
          index={props.index ?? 0}
          current={current}
          isLocaleReady={isLocaleReady}
          buildHref={buildHref}
        />
      )}
      {shouldShowChildren &&
        item.child?.map((childItem, index) => (
          <NavigationItem key={childItem.name} index={index} item={childItem} isChild />
        ))}
    </Fragment>
  );
};

export const MobileNavigationItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = ({ item, isChild }) => {
  const pathname = usePathname();
  const { t, isLocaleReady } = useLocale();
  const isCurrent: NavigationItemType["isCurrent"] = item.isCurrent || defaultIsCurrent;
  const current = isCurrent({ isChild: !!isChild, item, pathname });
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(item);

  if (!shouldDisplayNavigationItem) return null;

  return (
    <Link
      key={item.name}
      href={item.href}
      target={item.target}
      className="[&[aria-current='page']]:text-emphasis hover:text-default text-muted relative my-2 min-w-0 flex-1 overflow-hidden rounded-md !bg-transparent p-1 text-center text-xs font-medium focus:z-10 sm:text-sm"
      aria-current={current ? "page" : undefined}>
      {item.badge && <div className="absolute right-1 top-1">{item.badge}</div>}
      {item.icon && (
        <Icon
          name={item.icon}
          className="[&[aria-current='page']]:text-emphasis  mx-auto mb-1 block h-5 w-5 flex-shrink-0 text-center text-inherit"
          aria-hidden="true"
          aria-current={current ? "page" : undefined}
        />
      )}
      {isLocaleReady ? <span className="block truncate">{t(item.name)}</span> : <SkeletonText />}
    </Link>
  );
};

function MobileMoreItemWithChildren({
  item,
  isExpanded,
  onToggle,
  buildHref,
}: {
  item: NavigationItemType;
  isExpanded: boolean;
  onToggle: () => void;
  buildHref: (item: NavigationItemType) => string;
}) {
  const { t, isLocaleReady } = useLocale();

  return (
    <>
      <button
        onClick={onToggle}
        className="hover:bg-subtle flex w-full items-center justify-between p-5 text-left transition">
        <span className="text-default flex items-center font-semibold">
          {item.icon && (
            <Icon name={item.icon} className="h-5 w-5 flex-shrink-0 ltr:mr-3 rtl:ml-3" aria-hidden="true" />
          )}
          {isLocaleReady ? t(item.name) : <SkeletonText />}
        </span>
        <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="text-subtle h-5 w-5" />
      </button>
      {isExpanded && item.child && (
        <ul className="bg-subtle">
          {item.child.map((childItem) => (
            <li key={childItem.name} className="border-subtle border-t">
              <Link
                href={buildHref(childItem)}
                className="hover:bg-muted flex items-center p-4 pl-12 transition">
                <span className="text-default font-medium">
                  {isLocaleReady ? t(childItem.name) : <SkeletonText />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MobileMoreItemSimple({ item }: { item: NavigationItemType }) {
  const { t, isLocaleReady } = useLocale();

  return (
    <Link href={item.href} className="hover:bg-subtle flex items-center justify-between p-5 transition">
      <span className="text-default flex items-center font-semibold ">
        {item.icon && (
          <Icon name={item.icon} className="h-5 w-5 flex-shrink-0 ltr:mr-3 rtl:ml-3" aria-hidden="true" />
        )}
        {isLocaleReady ? t(item.name) : <SkeletonText />}
      </span>
      <Icon name="arrow-right" className="text-subtle h-5 w-5" />
    </Link>
  );
}

export const MobileNavigationMoreItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = ({ item }) => {
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(item);
  const [isExpanded, setIsExpanded] = usePersistedExpansionState(item.name);
  const buildHref = useBuildHref();

  if (!shouldDisplayNavigationItem) return null;

  const hasChildren = item.child && item.child.length > 0;

  return (
    <li className="border-subtle border-b last:border-b-0" key={item.name}>
      {hasChildren ? (
        <MobileMoreItemWithChildren
          item={item}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
          buildHref={buildHref}
        />
      ) : (
        <MobileMoreItemSimple item={item} />
      )}
    </li>
  );
};
