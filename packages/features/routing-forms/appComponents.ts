import dynamic from "next/dynamic";

export const routingFormAppComponents = {
  salesforce: dynamic(() => import("@calcom/app-store/salesforce/components/RoutingFormOptions")),
};
