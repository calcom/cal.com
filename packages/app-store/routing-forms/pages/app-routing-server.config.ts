import type { AppGetServerSideProps } from "@calcom/types/AppGetServerSideProps";

import { getServerSidePropsForSingleFormView as getServerSidePropsSingleForm } from "../components/getServerSidePropsSingleForm";
import { getServerSideProps as getServerSidePropsForms } from "./forms/getServerSideProps";
import { getServerSideProps as getServerSidePropsRoutingLink } from "./routing-link/getServerSideProps";

export const routingServerSidePropsConfig: Record<string, AppGetServerSideProps> = {
  forms: getServerSidePropsForms,
  "form-edit": getServerSidePropsSingleForm,
  "route-builder": getServerSidePropsSingleForm,
  "routing-link": getServerSidePropsRoutingLink,
  reporting: getServerSidePropsSingleForm,
  "incomplete-booking": getServerSidePropsSingleForm,
};
