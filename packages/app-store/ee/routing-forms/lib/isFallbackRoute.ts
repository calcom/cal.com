import { z } from "zod";

import { zodRoute } from "../zod";
import isRouter from "./isRouter";

export const isFallbackRoute = (route: z.infer<typeof zodRoute>) => {
  if (isRouter(route)) {
    return false;
  }
  return route.isFallback;
};
