import type { z } from "zod";
import type { zodRouterRouteView, zodRoute, zodRouterRoute, zodRouteView } from "../zod";
export default function isRouter(route: z.infer<typeof zodRouteView> | z.infer<typeof zodRoute>): route is z.infer<typeof zodRouterRouteView> | z.infer<typeof zodRouterRoute>;
//# sourceMappingURL=isRouter.d.ts.map