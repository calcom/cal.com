import ProgressBar from "@badrap/bar-of-progress";
import Router from "next/router";

import { trpc } from "@calcom/trpc/react";

import type { AppProps } from "@lib/app-providers";

import "../styles/globals.css";

const progress = new ProgressBar({
  size: 2,
  color: "var(--cal-brand)",
  className: "bar-of-progress",
  delay: 100,
});

Router.events.on("routeChangeStart", () => progress.start());
Router.events.on("routeChangeComplete", () => progress.finish());
Router.events.on("routeChangeError", () => progress.finish());

function MyApp(props: AppProps) {
  const { Component, pageProps } = props;
  if (Component.PageWrapper !== undefined) return Component.PageWrapper(props);
  return <Component {...pageProps} />;
}

export default trpc.withTRPC(MyApp);
