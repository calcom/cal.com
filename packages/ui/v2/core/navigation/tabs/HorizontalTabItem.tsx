import noop from "lodash/noop";
import Link from "next/link";
import { useRouter } from "next/router";
import { MouseEventHandler } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { SkeletonText } from "../../skeleton";

export type HorizontalTabItemProps<T extends string = "tabName"> = {
  name: string;
  disabled?: boolean;
  className?: string;
} & (
  | {
      href: string;
    }
  | ({
      href?: never;
    } & Partial<Record<T, string>>)
);

const HorizontalTabItem = function <T extends string>({
  name,
  href,
  tabNameKey,
  ...props
}: HorizontalTabItemProps<T> & {
  tabNameKey?: T;
}) {
  const router = useRouter();
  const { t, isLocaleReady } = useLocale();
  let newHref = "";
  let isCurrent;
  const _tabNameKey = tabNameKey || "tabName";
  const tabName = props[tabNameKey as keyof typeof props];

  if (href) {
    newHref = href;
    isCurrent = router.asPath.startsWith(href);
  } else if (tabName) {
    newHref = "";
    isCurrent = router.query[_tabNameKey] === tabName;
  }

  const onClick: MouseEventHandler = tabName
    ? (e) => {
        e.preventDefault();
        router.push({
          query: {
            ...router.query,
            [_tabNameKey]: tabName,
          },
        });
      }
    : noop;

  return (
    <Link key={name} href={props.disabled ? "#" : newHref}>
      <a
        onClick={onClick}
        className={classNames(
          isCurrent ? "bg-gray-200 text-gray-900" : "  text-gray-600 hover:bg-gray-100 hover:text-gray-900 ",
          "mb-2 inline-flex items-center justify-center whitespace-nowrap rounded-md py-[10px] px-4 text-sm font-medium leading-4 md:mb-0",
          props.disabled && "pointer-events-none !opacity-30",
          props.className
        )}
        aria-current={isCurrent ? "page" : undefined}>
        {isLocaleReady ? t(name) : <SkeletonText className="h-4 w-24" />}
      </a>
    </Link>
  );
};

export default HorizontalTabItem;
