"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

import "@calcom/embed-core/src/embed-iframe";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";

import AppProviders from "@lib/app-providers-app-dir";

export type PageWrapperProps = Readonly<{
  children: React.ReactNode;
  requiresLicense: boolean;
  nonce: string | undefined;
  isBookingPage?: boolean;
}>;

function PageWrapper(props: PageWrapperProps) {
  const pathname = usePathname();
  let pageStatus = "200";

  if (pathname === "/404") {
    pageStatus = "404";
  } else if (pathname === "/500") {
    pageStatus = "500";
  } else if (pathname === "/403") {
    pageStatus = "403";
  }

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
