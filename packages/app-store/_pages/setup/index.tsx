import dynamic from "next/dynamic";

import { DynamicComponent } from "../../_components/DynamicComponent";

export const AppSetupMap = {
  "apple-calendar": dynamic(() => import("../../applecalendar/pages/setup")),
  "caldav-calendar": dynamic(() => import("../../caldavcalendar/pages/setup")),
  zapier: dynamic(() => import("../../zapier/pages/setup")),
};

export const AppSetupPage = (props: { slug: string }) => {
  return <DynamicComponent<typeof AppSetupMap> componentMap={AppSetupMap} {...props} />;
};

export default AppSetupPage;
