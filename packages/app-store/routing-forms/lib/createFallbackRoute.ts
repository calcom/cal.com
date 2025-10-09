import * as LazyQbUtils from "@calcom/lib/raqb/lazyQbUtils";

import type { GlobalRoute, LocalRoute, SerializableRoute } from "../types/types";
import { RouteActionType } from "../zod";

export const createFallbackRoute = async (): Promise<Exclude<SerializableRoute, GlobalRoute>> => {
  const uuid = await LazyQbUtils.uuid();
  return {
    id: uuid,
    isFallback: true,
    action: {
      type: RouteActionType.CustomPageMessage,
      value: "Thank you for your interest! We will be in touch soon.",
    },
    queryValue: { id: uuid, type: "group" } as LocalRoute["queryValue"],
  };
};
