import { LocalRoute } from "../types/types";

export const RoutingPages: { label: string; value: NonNullable<LocalRoute["action"]>["type"] }[] = [
  {
    label: "Custom Page",
    value: "customPageMessage",
  },
  {
    label: "External Redirect",
    value: "externalRedirectUrl",
  },
  {
    label: "Event Redirect",
    value: "eventTypeRedirectUrl",
  },
];
