import type { IncomingMessage } from "http";
import type { AppContextType } from "next/dist/shared/lib/utils";
import React from "react";

import { trpc } from "@calcom/trpc/react";

import type { AppProps } from "@lib/app-providers";

import "../styles/globals.css";

function MyApp(props: AppProps) {
  const { Component, pageProps } = props;

  if (Component.PageWrapper !== undefined) return Component.PageWrapper(props);
  return <Component {...pageProps} />;
}

declare global {
  interface Window {
    calNewLocale: string;
  }
}

MyApp.getInitialProps = async (ctx: AppContextType) => {
  const { req } = ctx.ctx;

  let newLocale = "en";

  if (req) {
    const { getLocale } = await import("@calcom/features/auth/lib/getLocale");
    newLocale = await getLocale(req as IncomingMessage & { cookies: Record<string, any> });
  } else if (typeof window !== "undefined" && window.calNewLocale) {
    newLocale = window.calNewLocale;
  }

  return {
    pageProps: {
      newLocale,
    },
  };
};

const WrappedMyApp = trpc.withTRPC(MyApp);

export default WrappedMyApp;
