import dynamic from "next/dynamic";

export const routingFormAppComponents = {
  salesforce: dynamic(() => import("../salesforce/components/RoutingFormOptions")),
};
