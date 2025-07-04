import React, { Suspense } from "react";

import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";

interface HeaderProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  CTA?: React.ReactNode;
  ctaClassName?: string;
  borderInShellHeader?: boolean;
  backButton?: boolean;
}

export default function Header({
  children,
  title,
  description,
  CTA,
  ctaClassName,
  borderInShellHeader,
  backButton,
}: HeaderProps) {
  return (
    <div>
      <header
        className={classNames(
          "border-subtle mx-auto block justify-between sm:flex",
          borderInShellHeader && "rounded-t-lg border px-4 py-6 sm:px-6",
          borderInShellHeader === undefined && "mb-8 border-b pb-8"
        )}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full items-center">
            {backButton && (
              <a href="javascript:history.back()">
                <Icon name="arrow-left" className="mr-7" />
              </a>
            )}
            <div>
              {title ? (
                <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                  {title}
                </h1>
              ) : (
                <div className="bg-emphasis mb-1 h-5 w-24 animate-pulse rounded-lg" />
              )}
              {description ? (
                <p className="text-default text-sm ltr:mr-4 rtl:ml-4">{description}</p>
              ) : (
                <div className="bg-emphasis h-5 w-32 animate-pulse rounded-lg" />
              )}
            </div>
          </div>
          <div className={classNames("flex-shrink-0 sm:ms-auto", ctaClassName)}>{CTA}</div>
        </div>
      </header>
      <Suspense fallback={<Icon name="loader" className="mx-auto my-5 animate-spin" />}>{children}</Suspense>
    </div>
  );
}
