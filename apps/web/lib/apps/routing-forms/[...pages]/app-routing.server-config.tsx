import "server-only";

import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import { getServerSideProps as getServerSidePropsRoutingLink } from "./getServerSidePropsRoutingLink";
import { getServerSidePropsForSingleFormView as getServerSidePropsSingleForm } from "./getServerSidePropsSingleForm";

export const routingServerSidePropsConfig: Record<string, AppGetServerSideProps> = {
  "form-edit": getServerSidePropsSingleForm,
  "route-builder": getServerSidePropsSingleForm,
  "routing-link": getServerSidePropsRoutingLink,
  reporting: getServerSidePropsSingleForm,
  "incomplete-booking": getServerSidePropsSingleForm,
};
