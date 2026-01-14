"use client";

import { Profile } from "@calid/features/ui/Profile";
import { Icon } from "@calid/features/ui/components/icon";
import { useRouter } from "next/navigation";
import React, { Suspense } from "react";

import classNames from "@calcom/ui/classNames";

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
  const router = useRouter();

  return (
    <div>
      <header
        className={classNames(
          "border-subtle mx-auto block justify-between sm:flex lg:mb-8",
          borderInShellHeader && "rounded-t-lg border px-4 py-6 sm:px-6",
          borderInShellHeader === undefined && "mb-8 border-b pb-8"
        )}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full items-center">
            {backButton && (
              <button type="button" onClick={() => router.back()}>
                <Icon name="arrow-left" className="mr-7" />
              </button>
            )}
            <div>
              {title ? (
                <h3 className="text-emphasis text-xl font-semibold leading-5 tracking-wide">{title}</h3>
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
        <Profile />
      </header>
      <Suspense fallback={<Icon name="loader-circle" className="mx-auto my-5 animate-spin" />}>
        {children}
      </Suspense>
    </div>
  );
}
