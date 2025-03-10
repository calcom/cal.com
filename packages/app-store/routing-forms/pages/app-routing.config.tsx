//TODO: Generate this file automatically so that like in Next.js file based routing can work automatically
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import { getServerSidePropsForSingleFormView as getServerSidePropsSingleForm } from "../components/getServerSidePropsSingleForm";
import * as formEdit from "./form-edit/[...appPages]";
import * as forms from "./forms/[...appPages]";
// extracts getServerSideProps function from the client component
import { getServerSideProps as getServerSidePropsForms } from "./forms/getServerSideProps";
import * as IncompleteBooking from "./incomplete-booking/[...appPages]";
import * as Reporting from "./reporting/[...appPages]";
import * as RouteBuilder from "./route-builder/[...appPages]";
import * as RoutingLink from "./routing-link/[...appPages]";
import { getServerSideProps as getServerSidePropsRoutingLink } from "./routing-link/getServerSideProps";

const routingConfig = {
  "form-edit": formEdit,
  "route-builder": RouteBuilder,
  forms: forms,
  "routing-link": RoutingLink,
  reporting: Reporting,
  "incomplete-booking": IncompleteBooking,
};

export const routingServerSidePropsConfig: Record<string, AppGetServerSideProps> = {
  forms: getServerSidePropsForms,
  "form-edit": getServerSidePropsSingleForm,
  "route-builder": getServerSidePropsSingleForm,
  "routing-link": getServerSidePropsRoutingLink,
  reporting: getServerSidePropsSingleForm,
  "incomplete-booking": getServerSidePropsSingleForm,
};

export default routingConfig;
