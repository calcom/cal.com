import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import { getServerSideProps as getServerSidePropsForms } from "@lib/routing/getServerSideProps";
import { getServerSidePropsForSingleFormView as getServerSidePropsSingleForm } from "@lib/routing/getServerSidePropsSingleForm";

import * as formEdit from "./form-edit/[...appPages]";
import * as forms from "./forms/[...appPages]";
import * as LayoutHandler from "./layout-handler/[...appPages]";
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
  layoutHandler: LayoutHandler,
};

export const serverSidePropsConfig: Record<string, AppGetServerSideProps> = {
  forms: getServerSidePropsForms,
  "form-edit": getServerSidePropsSingleForm,
  "route-builder": getServerSidePropsSingleForm,
  "routing-link": getServerSidePropsRoutingLink,
  reporting: getServerSidePropsSingleForm,
};

export default routingConfig;
