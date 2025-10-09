import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { Fragment, useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
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
    try {
      // eslint-disable-next-line @calcom/eslint/avoid-web-storage
      const stored = sessionStorage.getItem(`nav-expansion-${itemName}`);
      if (stored !== null) {
        setIsExpanded(JSON.parse(stored));
      }
    } catch (_error) {}
  }, [itemName]);

  const setPersistedExpansion = (expanded: boolean) => {
    setIsExpanded(expanded);
    try {
      // eslint-disable-next-line @calcom/eslint/avoid-web-storage
      sessionStorage.setItem(`nav-expansion-${itemName}`, JSON.stringify(expanded));
    } catch (_error) {}
  };

  return [isExpanded, setPersistedExpansion] as const;
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

const defaultIsCurrent: NavigationItemType["isCurrent"] = ({ isChild, item, pathname }) => {
  return isChild ? item.href === pathname : item.href ? pathname?.startsWith(item.href) ?? false : false;
};

export const NavigationItem: React.FC<{
  index?: number;
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item, isChild } = props;
  const { t, isLocaleReady } = useLocale();
  const pathname = usePathname();
  const isCurrent: NavigationItemType["isCurrent"] = item.isCurrent || defaultIsCurrent;
  const current = isCurrent({ isChild: !!isChild, item, pathname });
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(props.item);
  const [isExpanded, setIsExpanded] = usePersistedExpansionState(item.name);

  const isTablet = useMediaQuery("(max-width: 1024px)");
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  if (!shouldDisplayNavigationItem) return null;

  const hasChildren = item.child && item.child.length > 0;
  const hasActiveChild =
    hasChildren && item.child?.some((child) => isCurrent({ isChild: true, item: child, pathname }));
  const shouldShowChildren = isExpanded || hasActiveChild || isCurrent({ pathname, isChild, item });
  const shouldShowChevron = hasChildren && !hasActiveChild;
  const isParentNavigationItem = hasChildren && !isChild;

  return (
    <Fragment>
      {isParentNavigationItem ? (
        <Tooltip
          side="right"
          open={isTooltipOpen}
          content={
            hasChildren ? (
              <div className="pointer-events-auto flex flex-col space-y-1 p-1">
                <span className="text-subtle px-2 text-xs font-semibold uppercase tracking-wide">
                  {t(item.name)}
                </span>
                <div className="flex flex-col">
                  {item.child?.map((childItem) => {
                    const childIsCurrent =
                      typeof childItem.isCurrent === "function"
                        ? childItem.isCurrent({ isChild: true, item: childItem, pathname })
                        : defaultIsCurrent({ isChild: true, item: childItem, pathname });
                    return (
                      <Link
                        key={childItem.name}
                        href={childItem.href}
                        aria-current={childIsCurrent ? "page" : undefined}
                        onClick={() => setIsTooltipOpen(false)}
                        className={classNames(
                          "group relative block rounded-md px-3 py-1 text-sm font-medium",
                          childIsCurrent
                            ? "bg-emphasis text-white"
                            : "hover:bg-emphasis text-mute hover:text-emphasis"
                        )}>
                        {t(childItem.name)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              t(item.name)
            )
          }
          className="lg:hidden">
          <button
            data-test-id={item.name}
            aria-label={t(item.name)}
            aria-expanded={isExpanded}
            aria-current={current ? "page" : undefined}
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (isTablet && hasChildren) {
                setIsTooltipOpen(!isTooltipOpen);
              }
            }}
            className={classNames(
              "todesktop:py-[7px] text-default group flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium transition",
              "[&[aria-current='page']]:!bg-transparent",
              "[&[aria-current='page']]:text-emphasis mt-0.5 text-sm",
              isLocaleReady
                ? "hover:bg-subtle todesktop:[&[aria-current='page']]:bg-emphasis todesktop:hover:bg-transparent hover:text-emphasis"
                : ""
            )}>
            {item.icon && (
              <Icon
                name={item.isLoading ? "rotate-cw" : item.icon}
                className={classNames(
                  "todesktop:!text-blue-500 mr-2 h-4 w-4 flex-shrink-0 rtl:ml-2 md:ltr:mx-auto lg:ltr:mr-2",
                  item.isLoading && "animate-spin"
                )}
                aria-hidden="true"
              />
            )}
            {isLocaleReady ? (
              <span className="hidden w-full justify-between truncate text-ellipsis lg:flex">
                {t(item.name)}
                {item.badge && item.badge}
              </span>
            ) : (
              <SkeletonText className="h-[20px] w-full" />
            )}
            {shouldShowChevron && (
              <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="ml-auto h-4 w-4" />
            )}
          </button>
        </Tooltip>
      ) : (
        <Tooltip side="right" content={t(item.name)} className="lg:hidden">
          <Link
            data-test-id={item.name}
            href={item.href}
            aria-label={t(item.name)}
            target={item.target}
            className={classNames(
              "todesktop:py-[7px] text-default group flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition",
              item.child
                ? `[&[aria-current='page']]:!bg-transparent`
                : `[&[aria-current='page']]:bg-emphasis`,
              isChild
                ? `[&[aria-current='page']]:text-emphasis [&[aria-current='page']]:bg-emphasis hidden h-8 pl-16 lg:flex lg:pl-11 ${
                    props.index === 0 ? "mt-0" : "mt-px"
                  }`
                : "[&[aria-current='page']]:text-emphasis mt-0.5 text-sm",
              isLocaleReady
                ? "hover:bg-subtle todesktop:[&[aria-current='page']]:bg-emphasis todesktop:hover:bg-transparent hover:text-emphasis"
                : ""
            )}
            aria-current={current ? "page" : undefined}>
            {item.icon && (
              <Icon
                name={item.isLoading ? "rotate-cw" : item.icon}
                className={classNames(
                  "todesktop:!text-blue-500 mr-2 h-4 w-4 flex-shrink-0 rtl:ml-2 md:ltr:mx-auto lg:ltr:mr-2 [&[aria-current='page']]:text-inherit",
                  item.isLoading && "animate-spin"
                )}
                aria-hidden="true"
                aria-current={current ? "page" : undefined}
              />
            )}
            {isLocaleReady ? (
              <span
                className="hidden w-full justify-between truncate text-ellipsis lg:flex"
                data-testid={`${item.name}-test`}>
                {t(item.name)}
                {item.badge && item.badge}
              </span>
            ) : (
              <SkeletonText className="h-[20px] w-full" />
            )}
            {item.name === "workflows" && (
              <Badge startIcon="sparkles" variant="purple">
                Cal.ai
              </Badge>
            )}
          </Link>
        </Tooltip>
      )}
      {item.child &&
        shouldShowChildren &&
        item.child.map((item, index) => <NavigationItem index={index} key={item.name} item={item} isChild />)}
    </Fragment>
  );
};

export const MobileNavigationItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item, isChild } = props;
  const pathname = usePathname();
  const { t, isLocaleReady } = useLocale();
  const isCurrent: NavigationItemType["isCurrent"] = item.isCurrent || defaultIsCurrent;
  const current = isCurrent({ isChild: !!isChild, item, pathname });
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(props.item);

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

export const MobileNavigationMoreItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item } = props;
  const { t, isLocaleReady } = useLocale();
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(props.item);
  const [isExpanded, setIsExpanded] = usePersistedExpansionState(item.name);

  if (!shouldDisplayNavigationItem) return null;

  const hasChildren = item.child && item.child.length > 0;

  return (
    <li className="border-subtle border-b last:border-b-0" key={item.name}>
      {hasChildren ? (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-subtle flex w-full items-center justify-between p-5 text-left transition">
            <span className="text-default flex items-center font-semibold">
              {item.icon && (
                <Icon
                  name={item.icon}
                  className="h-5 w-5 flex-shrink-0 ltr:mr-3 rtl:ml-3"
                  aria-hidden="true"
                />
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
                    href={childItem.href}
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
      ) : (
        <Link href={item.href} className="hover:bg-subtle flex items-center justify-between p-5 transition">
          <span className="text-default flex items-center font-semibold ">
            {item.icon && (
              <Icon name={item.icon} className="h-5 w-5 flex-shrink-0 ltr:mr-3 rtl:ml-3" aria-hidden="true" />
            )}
            {isLocaleReady ? t(item.name) : <SkeletonText />}
          </span>
          <Icon name="arrow-right" className="text-subtle h-5 w-5" />
        </Link>
      )}
    </li>
  );
};
