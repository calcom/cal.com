import { wrapGetServerSidePropsWithSentry } from "@sentry/nextjs";
import type { GetServerSidePropsContext } from "next";

import { getRoutedUrl, hasEmbedPath } from "@calcom/lib/server/getRoutedUrl";

import { TRPCError } from "@trpc/server";

export const getServerSideProps = wrapGetServerSidePropsWithSentry(async function getServerSideProps(
  context: GetServerSidePropsContext
) {
  try {
    return await getRoutedUrl(context);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") {
      context.res.statusCode = 429;
      const isEmbed = hasEmbedPath(context.req.url || "");

      return {
        props: {
          isEmbed,
          form: null,
          message: null,
          errorMessage: error.message,
        },
      };
    }
    throw error;
  }
},
"/router");
