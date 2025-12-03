import dynamic from "next/dynamic";
import { Fragment } from "react";

const initPostProvider = () => {
   
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return Fragment;
  }

  return dynamic(() => import("./provider"));
};

const DynamicPostHogProvider = initPostProvider();
export default DynamicPostHogProvider;
