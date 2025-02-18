import { wrapGetServerSidePropsWithSentry } from "@sentry/nextjs";
import type { GetServerSidePropsContext } from "next";

import { getRoutedUrl } from "@calcom/lib/server";

export const getServerSideProps = wrapGetServerSidePropsWithSentry(async function getServerSideProps(
  context: GetServerSidePropsContext
) {
  return await getRoutedUrl(context);
},
"/router");
