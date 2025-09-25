import "server-only";

import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import { getServerSidePropsForSingleFormViewCalId as getServerSidePropsSingleFormCalId } from "../components/getServerSidePropsSingleFormCalId";
import { getServerSideProps as getServerSidePropsRoutingLink } from "./routing-link/getServerSideProps";

export const routingServerSidePropsConfig: Record<string, AppGetServerSideProps> = {
  "form-edit": getServerSidePropsSingleFormCalId,
  "form-embed": getServerSidePropsSingleFormCalId,
  "details": getServerSidePropsSingleFormCalId,
  "route-builder": getServerSidePropsSingleFormCalId,
  "routing-link": getServerSidePropsRoutingLink,
  reporting: getServerSidePropsSingleFormCalId,
  "incomplete-booking": getServerSidePropsSingleFormCalId,
};
