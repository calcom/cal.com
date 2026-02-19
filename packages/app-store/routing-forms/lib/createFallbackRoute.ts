import { Utils as QbUtils } from "react-awesome-query-builder";

import type { GlobalRoute, LocalRoute, SerializableRoute } from "../types/types";
import { RouteActionType } from "../zod";
import { DEFAULT_FALLBACK_ROUTE_ACTION_MESSAGE } from "./constants";

export const createFallbackRoute = (): Exclude<SerializableRoute, GlobalRoute> => {
  const uuid = QbUtils.uuid();
  return {
    id: uuid,
    isFallback: true,
    action: {
      type: RouteActionType.CustomPageMessage,
      value: DEFAULT_FALLBACK_ROUTE_ACTION_MESSAGE,
    },
    queryValue: { id: uuid, type: "group" } as LocalRoute["queryValue"],
  };
};
