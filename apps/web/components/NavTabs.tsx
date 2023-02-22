import { AdminRequired } from "components/ui/AdminRequired";
import noop from "lodash/noop";
import type { LinkProps } from "next/link";
import Link from "next/link";
import { useRouter } from "next/router";
import type { FC, MouseEventHandler } from "react";
import { Fragment } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import classNames from "@lib/classNames";
import type { SVGComponent } from "@lib/types/SVGComponent";

export interface NavTabProps {
  tabs: {
    name: string;
    /** If you want to change the path as per current tab */
    href?: string;
    /** If you want to change query param tabName as per current tab */
    tabName?: string;
    icon?: SVGComponent;
    adminRequired?: boolean;
    className?: string;
  }[];
  linkProps?: Omit<LinkProps, "href">;
}

const NavTabs: FC<NavTabProps> = ({ tabs, linkProps, ...props }) => {
  const router = useRouter();
  const { t } = useLocale();
  return (
    <>
      <nav
        className="no-scrollbar -mb-px flex space-x-5 overflow-x-scroll rtl:space-x-reverse sm:rtl:space-x-reverse"
        aria-label="Tabs"
        {...props}>
        {tabs.map((tab) => {
          if ((tab.tabName && tab.href) || (!tab.tabName && !tab.href)) {
            throw new Error("Use either tabName or href");
          }
          let href = "";
          let isCurrent;
          if (tab.href) {
            href = tab.href;
            isCurrent = router.asPath === tab.href;
          } else if (tab.tabName) {
            href = "";
            isCurrent = router.query.tabName === tab.tabName;
          }

          const onClick: MouseEventHandler = tab.tabName
            ? (e) => {
                e.preventDefault();
                router.push({
                  query: {
                    ...router.query,
                    tabName: tab.tabName,
                  },
                });
              }
            : noop;

          const Component = tab.adminRequired ? AdminRequired : Fragment;
          const className = tab.className || "";
          return (
            <Component key={tab.name}>
              <Link key={tab.name} href={href} {...linkProps} legacyBehavior>
                <a
                  onClick={onClick}
                  className={classNames(
                    isCurrent
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                    "group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium",
                    className
                  )}
                  aria-current={isCurrent ? "page" : undefined}>
                  {tab.icon && (
                    <tab.icon
                      className={classNames(
                        isCurrent ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500",
                        "-ml-0.5 hidden h-4 w-4 ltr:mr-2 rtl:ml-2 sm:inline-block"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span>{t(tab.name)}</span>
                </a>
              </Link>
            </Component>
          );
        })}
      </nav>
      <hr />
    </>
  );
};

export default NavTabs;
