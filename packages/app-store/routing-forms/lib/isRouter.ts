import type { z } from "zod";
import type { zodRoute, zodRouterRoute, zodRouterRouteView, zodRouteView } from "../zod";

export default function isRouter(
  route: z.infer<typeof zodRouteView> | z.infer<typeof zodRoute>
): route is z.infer<typeof zodRouterRouteView> | z.infer<typeof zodRouterRoute> {
  if ("isRouter" in route) {
    return route.isRouter;
  }
  return false;
}
