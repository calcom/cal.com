import dynamic from "next/dynamic";

import { DynamicComponent } from "./DynamicComponent";

export const AppSetupMap = {
  zapier: dynamic(() => import("../zapier/components/AppSettings")),
};

export const AppSettings = (props: { slug: string }) => {
  return <DynamicComponent<typeof AppSetupMap> componentMap={AppSetupMap} {...props} />;
};
