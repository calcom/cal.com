import dynamic from "next/dynamic";

import "@calcom/embed-core/src/embed-iframe";
import { trpc } from "@calcom/trpc/react";

import type { AppProps } from "@lib/app-providers";

import "../styles/globals.css";

const LazyApp = dynamic(() => import("../components/App"), {
  loading: () => <p>Loading...</p>,
});

function MyApp(props: AppProps) {
  return <LazyApp {...props} />;
}

export default trpc.withTRPC(MyApp);
