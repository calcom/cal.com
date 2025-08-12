import "server-only";

import type { AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";
import type { NextJsLegacyContext } from "@calcom/web/lib/buildLegacyCtx";

import { getServerSidePropsForSingleFormView as getServerSidePropsSingleForm } from "../components/getServerSidePropsSingleForm";
import { getServerSideProps as getServerSidePropsRoutingLink } from "./routing-link/getServerSideProps";

export const routingServerSidePropsConfig: Record<
  string,
  (context: NextJsLegacyContext, prisma: AppPrisma, user: AppUser) => Promise<any>
> = {
  "form-edit": getServerSidePropsSingleForm,
  "route-builder": getServerSidePropsSingleForm,
  "routing-link": getServerSidePropsRoutingLink,
  reporting: getServerSidePropsSingleForm,
  "incomplete-booking": getServerSidePropsSingleForm,
};
