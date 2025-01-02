// packages/app-store/routing-forms/pages/app-routing.config.tsx
import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import { getServerSidePropsForSingleFormView as getServerSidePropsSingleForm } from "../components/getServerSidePropsSingleForm";
import * as formEdit from "./form-edit/[...appPages]";
import * as forms from "./forms/[...appPages]";
import { getServerSideProps as getServerSidePropsForms } from "./forms/getServerSideProps";
import * as LayoutHandler from "./layout-handler/[...appPages]";
import * as Reporting from "./reporting/[...appPages]";
import * as RouteBuilder from "./route-builder/[...appPages]";
import * as RoutingLink from "./routing-link/[...appPages]";
import { getServerSideProps as getServerSidePropsRoutingLink } from "./routing-link/getServerSideProps";

// Legacy routing config for pages router (can be removed after full migration)
const routingConfig = {
  "form-edit": formEdit,
  "route-builder": RouteBuilder,
  forms: forms,
  "routing-link": RoutingLink,
  reporting: Reporting,
  layoutHandler: LayoutHandler,
};

// Server-side props config (used by both app router and pages router)
export const serverSidePropsConfig: Record<string, AppGetServerSideProps> = {
  forms: getServerSidePropsForms,
  "form-edit": getServerSidePropsSingleForm,
  "route-builder": getServerSidePropsSingleForm,
  "routing-link": getServerSidePropsRoutingLink,
  reporting: getServerSidePropsSingleForm,
};

export default routingConfig;
