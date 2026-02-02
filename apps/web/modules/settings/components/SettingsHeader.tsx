"use client";

import React, { Suspense } from "react";

import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";
import { Button } from "@calcom/ui/components/button";
import { useLocale } from "@calcom/lib/hooks/useLocale";

type HeaderPropsBase = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  CTA?: React.ReactNode;
  ctaClassName?: string;
  borderInShellHeader?: boolean;
};

type HeaderPropsWithBackButton = HeaderPropsBase & {
  backButton: true;
  onBackButtonClick: () => void;
};

type HeaderPropsWithoutBackButton = HeaderPropsBase & {
  backButton?: false;
  onBackButtonClick?: never;
};

type HeaderProps = HeaderPropsWithBackButton | HeaderPropsWithoutBackButton;

export default function Header({
  children,
  title,
  description,
  CTA,
  ctaClassName,
  borderInShellHeader,
  backButton,
  onBackButtonClick,
}: HeaderProps) {
  const { t } = useLocale();
  
  return (
    <div>
      <header
        className={classNames(
          "border-subtle mx-auto flex justify-between",
          borderInShellHeader && "rounded-t-lg border px-4 py-6 sm:px-6",
          borderInShellHeader === undefined && "mb-8 border-b pb-8"
        )}>
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center">
            {backButton && onBackButtonClick && (
              <Button
                variant="icon"
                size="sm"
                color="minimal"
                onClick={onBackButtonClick}
                className="rounded-md ltr:mr-2 rtl:ml-2"
                StartIcon="arrow-left"
                aria-label={t("go_back")}
              />
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
          <div className={classNames("shrink-0", ctaClassName)}>{CTA}</div>
        </div>
      </header>
      <Suspense fallback={<Icon name="loader" className="mx-auto my-5 animate-spin" />}>{children}</Suspense>
    </div>
  );
}
