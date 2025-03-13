import FormEdit from "./form-edit/[...appPages]";
import Forms from "./forms/[...appPages]";
import IncompleteBooking from "./incomplete-booking/[...appPages]";
import Reporting from "./reporting/[...appPages]";
import RouteBuilder from "./route-builder/[...appPages]";
import RoutingLink from "./routing-link/[...appPages]";

export const routingConfig = {
  "form-edit": FormEdit,
  "route-builder": RouteBuilder,
  forms: Forms,
  "routing-link": RoutingLink,
  reporting: Reporting,
  "incomplete-booking": IncompleteBooking,
};
