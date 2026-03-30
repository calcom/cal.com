"use client";

import "@calcom/embed-core/src/embed-iframe";
import LicenseRequired from "~/ee/common/components/LicenseRequired";

import AppProviders from "@lib/app-providers-app-dir";

export type PageWrapperProps = Readonly<{
  children: React.ReactNode;
  requiresLicense: boolean;
  nonce: string | undefined;
  isBookingPage?: boolean;
}>;

function PageWrapper(props: PageWrapperProps) {
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
