//TODO: Generate this file automatically so that like in Next.js file based routing can work automatically
import * as formEdit from "./form-edit/[...appPages]";
import * as forms from "./forms/[...appPages]";
// extracts getServerSideProps function from the client component
import * as LayoutHandler from "./layout-handler/[...appPages]";
import * as Reporting from "./reporting/[...appPages]";
import * as RouteBuilder from "./route-builder/[...appPages]";
import * as RoutingLink from "./routing-link/[...appPages]";

const routingConfig = {
  "form-edit": formEdit,
  "route-builder": RouteBuilder,
  forms: forms,
  "routing-link": RoutingLink,
  reporting: Reporting,
  layoutHandler: LayoutHandler,
};

export default routingConfig;
