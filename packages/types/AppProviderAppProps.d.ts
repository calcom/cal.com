import type { Session } from "next-auth";
import type { SSRConfig } from "next-i18next";
import type { AppProps as NextAppProps } from "next/app";

import type { WithLocaleProps } from "@calcom/types/withLocale";
import type { WithNonceProps } from "@calcom/types/withNonce";

// Workaround for https://github.com/vercel/next.js/issues/8592
export type AppProps = Omit<
  NextAppProps<
    WithLocaleProps<
      WithNonceProps<{
        themeBasis?: string;
        session: Session;
        i18n?: SSRConfig;
      }>
    >
  >,
  "Component"
> & {
  Component: NextAppProps["Component"] & {
    requiresLicense?: boolean;
    isThemeSupported?: boolean;
    isBookingPage?: boolean | ((arg: { router: NextAppProps["router"] }) => boolean);
    getLayout?: (page: React.ReactElement) => ReactNode;
    PageWrapper?: (props: AppProps) => JSX.Element;
  };

  /** Will be defined only is there was an error */
  err?: Error;
};
