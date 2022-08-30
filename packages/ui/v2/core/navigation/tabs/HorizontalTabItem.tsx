import noop from "lodash/noop";
import Link from "next/link";
import { useRouter } from "next/router";
import { MouseEventHandler } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export type HorizontalTabItemProps = {
  name: string;
  disabled?: boolean;
} & (
  | {
      /** If you want to change query param tabName as per current tab */
      href: string;
      tabName?: never;
    }
  | {
      href?: never;
      /** If you want to change the path as per current tab */
      tabName: string;
    }
);

const HorizontalTabItem = ({ name, href, tabName, ...props }: HorizontalTabItemProps) => {
  const router = useRouter();
  const { t } = useLocale();
  let newHref = "";
  let isCurrent;
  if (href) {
    newHref = href;
    isCurrent = router.asPath === href;
  } else if (tabName) {
    newHref = "";
    isCurrent = router.query.tabName === tabName;
  }

  const onClick: MouseEventHandler = tabName
    ? (e) => {
        e.preventDefault();
        router.push({
          query: {
            ...router.query,
            tabName,
          },
        });
      }
    : noop;

  return (
    <Link key={name} href={props.disabled ? "#" : newHref}>
      <a
        onClick={onClick}
        className={classNames(
          isCurrent ? "bg-gray-200 text-gray-900" : " text-gray-600 hover:bg-gray-100 hover:text-gray-900 ",
          "mb-2 inline-flex items-center justify-center whitespace-nowrap rounded-md py-[10px] px-4 text-sm font-medium leading-4 md:mb-0",
          props.disabled && "pointer-events-none !opacity-30"
        )}
        aria-current={isCurrent ? "page" : undefined}>
        {t(name)}
      </a>
    </Link>
  );
};

export default HorizontalTabItem;
