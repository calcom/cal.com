import { Utils as QbUtils } from "react-awesome-query-builder";

import { GlobalRoute, SerializableRoute } from "../types/types";

export const createFallbackRoute = (): Exclude<SerializableRoute, GlobalRoute> => {
  const uuid = QbUtils.uuid();
  return {
    id: uuid,
    isFallback: true,
    action: {
      type: "customPageMessage",
      value: "Thank you for your interest! We will be in touch soon.",
    },
    queryValue: { id: uuid, type: "group" },
  };
};
