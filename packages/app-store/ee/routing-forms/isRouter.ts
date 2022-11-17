import { z } from "zod";

import { zodGlobalRouteView, zodRoute, zodGlobalRoute, zodRouteView } from "./zod";

export default function isRouter(
  route: z.infer<typeof zodRouteView> | z.infer<typeof zodRoute>
): route is z.infer<typeof zodGlobalRouteView> | z.infer<typeof zodGlobalRoute> {
  if ("routerType" in route) {
    return true;
  }
  return false;
}
