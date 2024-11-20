import dynamic from "next/dynamic";

import { DynamicComponent } from "../../_components/DynamicComponent";

export const AppSetupMap = {
  alby: dynamic(() => import("../../../apps/alby/pages/setup")),
  "apple-calendar": dynamic(() => import("../../../apps/applecalendar/pages/setup")),
  exchange: dynamic(() => import("../../../apps/exchangecalendar/pages/setup")),
  "exchange2013-calendar": dynamic(() => import("../../../apps/exchange2013calendar/pages/setup")),
  "exchange2016-calendar": dynamic(() => import("../../../apps/exchange2016calendar/pages/setup")),
  "caldav-calendar": dynamic(() => import("../../../apps/caldavcalendar/pages/setup")),
  "ics-feed": dynamic(() => import("../../../apps/ics-feedcalendar/pages/setup")),
  zapier: dynamic(() => import("../../../apps/zapier/pages/setup")),
  make: dynamic(() => import("../../../apps/make/pages/setup")),
  closecom: dynamic(() => import("../../../apps/closecom/pages/setup")),
  sendgrid: dynamic(() => import("../../../apps/sendgrid/pages/setup")),
  stripe: dynamic(() => import("../../../apps/stripepayment/pages/setup")),
  paypal: dynamic(() => import("../../../apps/paypal/pages/setup")),
};

export const AppSetupPage = (props: { slug: string }) => {
  return <DynamicComponent<typeof AppSetupMap> componentMap={AppSetupMap} {...props} />;
};

export default AppSetupPage;
