import { Utils as QbUtils } from "react-awesome-query-builder";

import type { GlobalRoute, LocalRoute, SerializableRoute } from "../types/types";
import { RouteActionType } from "../zod";

export const createFallbackRoute = (): Exclude<SerializableRoute, GlobalRoute> => {
  const uuid = QbUtils.uuid();
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
