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
      <nav
        className="-mb-px flex space-x-2 space-x-5 rtl:space-x-reverse sm:rtl:space-x-reverse"
        aria-label="Tabs">
        {tabs.map((tab) => {
          let hrefProps;
          let isCurrent;
          if (typeof tab.href === "string") {
            hrefProps = { href: tab.href };
            isCurrent = router.asPath === tab.href;
          } else {
            //TODO: Handle Current Implementation
            hrefProps = {
              href: "",
              onClick: (e) => {
                e.preventDefault();
                router.push(tab.href);
              },
            };
          }
          return (
            <Link key={tab.name} href="" {...linkProps}>
              <a
                onClick={hrefProps.onClick}
                className={classNames(
                  isCurrent
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                  "group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium"
                )}
                aria-current={isCurrent ? "page" : undefined}>
                {tab.icon && (
                  <tab.icon
                    className={classNames(
                      isCurrent ? "text-neutral-900" : "text-gray-400 group-hover:text-gray-500",
                      "-ml-0.5 hidden h-5 w-5 ltr:mr-2 rtl:ml-2 sm:inline-block"
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
