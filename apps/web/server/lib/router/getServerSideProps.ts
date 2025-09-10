import { wrapGetServerSidePropsWithSentry } from "@sentry/nextjs";
import { checkBotId } from "botid/server";
import type { GetServerSidePropsContext } from "next";

import { getRoutedUrl, hasEmbedPath } from "@calcom/features/routing-forms/lib/getRoutedUrl";

import { TRPCError } from "@trpc/server";

export const getServerSideProps = wrapGetServerSidePropsWithSentry(async function getServerSideProps(
  context: GetServerSidePropsContext
) {
  const isEmbed = hasEmbedPath(context.req.url || "");

  if (!process.env.NEXT_PUBLIC_IS_E2E) {
    const verification = await checkBotId();
    if (verification.isBot) {
      return {
        props: {
          isEmbed,
          message: null,
          form: null,
          errorMessage: "Access denied",
        },
      };
    }
  }
  try {
    return await getRoutedUrl(context);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS") {
      context.res.statusCode = 429;

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
