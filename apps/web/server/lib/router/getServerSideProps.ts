import { wrapGetServerSidePropsWithSentry } from "@sentry/nextjs";
import type { GetServerSidePropsContext } from "next";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { getRoutedUrl } from "@calcom/lib/server/getRoutedUrl";

export const getServerSideProps = wrapGetServerSidePropsWithSentry(async function getServerSideProps(
  context: GetServerSidePropsContext
) {
  const userIp = getIP(context.req as any);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `router.embed-${userIp}`,
  });

  return await getRoutedUrl(context);
},
"/router");
