import { SessionProvider } from "next-auth/react";
import { appWithTranslation } from "next-i18next";
import type { AppProps as NextAppProps, AppProps as NextJsAppProps } from "next/app";
import { NextRouter } from "next/router";
import { ComponentProps, ReactNode } from "react";

import { trpc } from "@calcom/trpc/react";
import DynamicHelpscoutProvider from "@ee/lib/helpscout/providerDynamic";
import DynamicIntercomProvider from "@ee/lib/intercom/providerDynamic";

import usePublicPage from "@lib/hooks/usePublicPage";

const I18nextAdapter = appWithTranslation<NextJsAppProps & { children: React.ReactNode }>(({ children }) => (
  <>{children}</>
));

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = Omit<NextAppProps, "Component"> & {
  Component: NextAppProps["Component"] & {
    requiresLicense?: boolean;
    isThemeSupported?: boolean | ((arg: { router: NextRouter }) => boolean);
  };
  /** Will be defined only is there was an error */
  err?: Error;
};

type AppPropsWithChildren = AppProps & {
  children: ReactNode;
};

const CustomI18nextProvider = (props: AppPropsWithChildren) => {
  /**
   * i18n should never be clubbed with other queries, so that it's caching can be managed independently.
   * We intend to not cache i18n query
   **/
  const { i18n, locale } = trpc.useQuery(["viewer.public.i18n"], { context: { skipBatch: true } }).data ?? {
    locale: "en",
  };

  const passedProps = {
    ...props,
    pageProps: {
      ...props.pageProps,
      ...i18n,
    },
    router: locale ? { locale } : props.router,
  } as unknown as ComponentProps<typeof I18nextAdapter>;
  return <I18nextAdapter {...passedProps} />;
};

const AppProviders = (props: AppPropsWithChildren) => {
  const session = trpc.useQuery(["viewer.public.session"]).data;
  // No need to have intercom on public pages - Good for Page Performance
  const isPublicPage = usePublicPage();
  const RemainingProviders = (
    <SessionProvider session={session || undefined}>
      <CustomI18nextProvider {...props}>{props.children}</CustomI18nextProvider>
    </SessionProvider>
  );

  if (isPublicPage) {
    return RemainingProviders;
  }

  return (
    <DynamicHelpscoutProvider>
      <DynamicIntercomProvider>{RemainingProviders}</DynamicIntercomProvider>
    </DynamicHelpscoutProvider>
  );
};

export default AppProviders;
