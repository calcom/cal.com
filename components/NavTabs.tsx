import Link, { LinkProps } from "next/link";
import { useRouter } from "next/router";
import React, { ElementType, FC } from "react";

import classNames from "@lib/classNames";

interface Props {
  tabs: {
    name: string;
    href: string;
    icon?: ElementType;
  }[];
  linkProps?: Omit<LinkProps, "href">;
}

const NavTabs: FC<Props> = ({ tabs, linkProps }) => {
  const router = useRouter();
  return (
    <>
      <nav className="flex -mb-px space-x-2 sm:space-x-5" aria-label="Tabs">
        {tabs.map((tab) => {
          const isCurrent = router.asPath === tab.href;
          return (
            <Link {...linkProps} key={tab.name} href={tab.href}>
              <a
                className={classNames(
                  isCurrent
                    ? "border-neutral-900 text-neutral-900 dark:text-gray-200 dark:border-gray-200"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-100",
                  "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm"
                )}
                aria-current={isCurrent ? "page" : undefined}>
                {tab.icon && (
                  <tab.icon
                    className={classNames(
                      isCurrent
                        ? "text-neutral-900 dark:text-white"
                        : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-100",
                      "-ml-0.5 mr-2 h-5 w-5 hidden sm:inline-block"
                    )}
                    aria-hidden="true"
                  />
                )}
                <span>{tab.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>
      <hr />
    </>
  );
};

export default NavTabs;
