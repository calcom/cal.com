import noop from "lodash/noop";
import Link from "next/link";
import { useRouter } from "next/router";
import { FC, Fragment, MouseEventHandler } from "react";
import { ChevronRight } from "react-feather";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SVGComponent } from "@calcom/types/SVGComponent";

export type VerticalTabItemProps = {
  name: string;
  info?: string;
  icon?: SVGComponent;
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

const VerticalTabItem: FC<VerticalTabItemProps> = ({ name, href, tabName, info, ...props }) => {
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
    <Fragment key={name}>
      <Link key={name} href={props.disabled ? "#" : newHref}>
        <a
          onClick={onClick}
          className={classNames(
            isCurrent ? "bg-gray-200 text-gray-900" : "bg-white text-gray-600 hover:bg-gray-100",
            "group flex h-14 w-64 flex-row rounded-md px-3 py-[10px]",
            props.disabled && "pointer-events-none !opacity-30",
            !info ? "h-9" : "h-14"
          )}
          aria-current={isCurrent ? "page" : undefined}>
          {props.icon && <props.icon className="mr-[10px] h-[14px] w-[14px] stroke-[1.5px]" />}
          <div
            className={classNames(
              isCurrent ? "font-bold text-gray-900" : "text-gray-600 group-hover:text-gray-700"
            )}>
            <p className="pb-1 text-sm font-medium leading-none">{t(name)}</p>
            {info && <p className="text-xs font-normal">{t(info)}</p>}
          </div>
          {isCurrent && (
            <div className="ml-auto self-center">
              <ChevronRight className="stroke-[1.5px]" />
            </div>
          )}
        </a>
      </Link>
    </Fragment>
  );
};

export default VerticalTabItem;
