import type { z } from "zod";

import type { zodRoute } from "../zod";
import isRouter from "./isRouter";

export const isFallbackRoute = (route: z.infer<typeof zodRoute>) => {
  if (isRouter(route)) {
    return false;
  }
  return route.isFallback;
};
