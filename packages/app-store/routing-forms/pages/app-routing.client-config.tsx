export const routingFormsComponents = {
  "form-edit": () => import("./form-edit/[...appPages]").then((mod) => mod.default),
  "route-builder": () => import("./route-builder/[...appPages]").then((mod) => mod.default),
  "routing-link": () => import("./routing-link/[...appPages]").then((mod) => mod.default),
  reporting: () => import("./reporting/[...appPages]").then((mod) => mod.default),
  "incomplete-booking": () => import("./incomplete-booking/[...appPages]").then((mod) => mod.default),
};
