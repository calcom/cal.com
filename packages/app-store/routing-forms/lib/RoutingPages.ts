import type { LocalRoute } from "../types/types";
import { RouteActionType } from "../zod";

export interface RoutingPage {
  label: string;
  value: NonNullable<LocalRoute["action"]>["type"];
}

export const RoutingPages: RoutingPage[] = [
  {
    label: "Custom Page",
    value: RouteActionType.CustomPageMessage,
  },
  {
    label: "External Redirect",
    value: RouteActionType.ExternalRedirectUrl,
  },
  {
    label: "Event Redirect",
    value: RouteActionType.EventTypeRedirectUrl,
  },
];
