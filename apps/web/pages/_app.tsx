import { AuthContextProvider } from "context/authContext";
import React from "react";

import { trpc } from "@calcom/trpc/react";

import type { AppProps } from "@lib/app-providers";

import "../styles/globals.css";

function MyApp(props: AppProps) {
  const { Component, pageProps } = props;
  if (Component.PageWrapper !== undefined) return Component.PageWrapper(props);
  return (
    <AuthContextProvider>
      <Component {...pageProps} />
    </AuthContextProvider>
  );
}

export default trpc.withTRPC(MyApp);
