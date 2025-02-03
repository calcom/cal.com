import type { LocalRoute } from "../types/types";
import { RouteActionType } from "../zod";

export const RoutingPages: { label: string; value: NonNullable<LocalRoute["action"]>["type"] }[] = [
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
