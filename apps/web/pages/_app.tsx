import type { IncomingMessage } from "http";
import type { NextApiRequest } from "next";
import type { AppContextType } from "next/dist/shared/lib/utils";
import React from "react";

import { trpc } from "@calcom/trpc/react";

import type { AppProps } from "@lib/app-providers";
import { useRedirectIfPlatformUser } from "@lib/useRedirectIfPlatformUser";

import "../styles/globals.css";

function MyApp(props: AppProps) {
  const { Component, pageProps } = props;
  const isPlatformUser = pageProps.isPlatformUser;

  // custom hook to handle redirection for platform users
  // this hook checks if the user is logged in and is a platform user, and redirects them accordingly
  useRedirectIfPlatformUser(isPlatformUser);

  if (Component.PageWrapper !== undefined) return Component.PageWrapper(props);
  return <Component {...pageProps} />;
}

declare global {
  interface Window {
    calNewLocale: string;
  }
}

MyApp.getInitialProps = async (ctx: AppContextType) => {
  const { req, res } = ctx.ctx;

  let newLocale = "en";
  let isPlatformUser = false;

  if (req) {
    const { getLocale } = await import("@calcom/features/auth/lib/getLocale");
    const { getServerSession } = await import("@calcom/features/auth/lib/getServerSession");
    const userSession = await getServerSession({ req: req as NextApiRequest, res });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newLocale = await getLocale(req as IncomingMessage & { cookies: Record<string, any> });
    isPlatformUser = userSession?.isPlatformUser ?? false;
  } else if (typeof window !== "undefined" && window.calNewLocale) {
    newLocale = window.calNewLocale;
  }

  return {
    pageProps: {
      newLocale,
      isPlatformUser,
    },
  };
};

const WrappedMyApp = trpc.withTRPC(MyApp);

export default WrappedMyApp;
