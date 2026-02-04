import dynamic from "next/dynamic";

const DynamicPostHogPageView = dynamic(() => import("./PostHogPageView"), {
  ssr: false,
});

export default DynamicPostHogPageView;
