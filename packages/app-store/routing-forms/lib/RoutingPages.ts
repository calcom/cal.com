import type { LocalRoute } from "../types/types";
import { RouteActionType } from "../zod";

export const RoutingPages: { label: string; value: NonNullable<LocalRoute["action"]>["type"] }[] = [
  {
    label: "Custom page",
    value: RouteActionType.CustomPageMessage,
  },
  {
    label: "External redirect",
    value: RouteActionType.ExternalRedirectUrl,
  },
  {
    label: "Event redirect",
    value: RouteActionType.EventTypeRedirectUrl,
  },
];
