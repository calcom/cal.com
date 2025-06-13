import { wrapGetServerSidePropsWithSentry } from "@sentry/nextjs";
import type { GetServerSidePropsContext } from "next";

import { getRoutedUrl } from "@calcom/lib/server/getRoutedUrl";
import { runWithTenants } from "@calcom/prisma/store/prismaStore";
import { getTenantFromHost } from "@calcom/prisma/store/tenants";

export const getServerSideProps = wrapGetServerSidePropsWithSentry(async function getServerSideProps(
  context: GetServerSidePropsContext
) {
  const host = context.req.headers.host || "";
  const tenant = getTenantFromHost(host);
  return await runWithTenants(tenant, () => getRoutedUrl(context));
},
"/router");
