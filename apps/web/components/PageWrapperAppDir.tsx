"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

import "@calcom/embed-core/src/embed-iframe";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";

import AppProviders from "@lib/app-providers-app-dir";

export type PageWrapperProps = Readonly<{
  children: React.ReactNode;
  requiresLicense: boolean;
  nonce: string | undefined;
  isBookingPage?: boolean;
}>;

function usePageStatus() {
  const [pageStatus, setPageStatus] = useState("200");
  const pathname = usePathname();

  useEffect(() => {
    const checkForErrorPage = () => {
      const has404Content = document.querySelector('[data-testid="app-router-not-found-page"]');
      if (has404Content) {
        setPageStatus("404");
        return;
      }

      const hasErrorContent = document.querySelector('[data-testid="app-router-error-page"]');
      if (hasErrorContent) {
        setPageStatus("500");
        return;
      }
    };

    checkForErrorPage();

    // Check after a small delay to ensure content has rendered
    const timer = setTimeout(checkForErrorPage, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return pageStatus;
}

function PageWrapper(props: PageWrapperProps) {
  const pageStatus = usePageStatus();

  // On client side don't let nonce creep into DOM
  // It also avoids hydration warning that says that Client has the nonce value but server has "" because browser removes nonce attributes before DOM is built
  // See https://github.com/kentcdodds/nonce-hydration-issues
  // Set "" only if server had it set otherwise keep it undefined because server has to match with client to avoid hydration error
  const nonce = typeof window !== "undefined" ? (props.nonce ? "" : undefined) : props.nonce;
  const providerProps: PageWrapperProps = {
    ...props,
    nonce,
  };

  return (
    <>
      <AppProviders {...providerProps}>
        <>
          <Script
            nonce={nonce}
            id="page-status"
            // It is strictly not necessary to disable, but in a future update of react/no-danger this will error.
            // And we don't want it to error here anyways
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: `window.CalComPageStatus = '${pageStatus}'` }}
          />
          {props.requiresLicense ? (
            <LicenseRequired>{props.children}</LicenseRequired>
          ) : (
            <>{props.children}</>
          )}
        </>
      </AppProviders>
    </>
  );
}

export default PageWrapper;
