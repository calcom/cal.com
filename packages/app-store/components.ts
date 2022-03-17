import dynamic from "next/dynamic";

export const AddIntegration = {
  applecalendar: dynamic(() => import("./applecalendar/components/AddIntegration")),
  caldavcalendar: dynamic(() => import("./caldavcalendar/components/AddIntegration")),
};
