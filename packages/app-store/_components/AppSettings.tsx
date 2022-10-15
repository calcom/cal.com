import dynamic from "next/dynamic";

import { DynamicComponent } from "./DynamicComponent";

export const AppSettingsMap = {
  zapier: dynamic(() => import("../zapier/components/AppSettings")),
};

export const AppSettings = (props: { slug: string }) => {
  return <DynamicComponent<typeof AppSettingsMap> componentMap={AppSettingsMap} {...props} />;
};
