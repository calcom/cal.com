export const routingFormsComponents = {
  "form-edit": () => import("./FormEdit").then((mod) => mod.default),
  "route-builder": () => import("./RouteBuilder").then((mod) => mod.default),
  "routing-link": () => import("./RoutingLink").then((mod) => mod.default),
  "incomplete-booking": () => import("./IncompleteBooking").then((mod) => mod.default),
};
