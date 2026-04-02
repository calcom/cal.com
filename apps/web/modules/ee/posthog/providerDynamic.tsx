import process from "node:process";
import dynamic from "next/dynamic";
import { Fragment } from "react";

const initPostProvider = () => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return Fragment;
  }

  return dynamic(() => import("./provider"));
};

const DynamicPostHogProvider = initPostProvider();
export default DynamicPostHogProvider;
