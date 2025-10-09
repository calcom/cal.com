import { wrapGetServerSidePropsWithSentry } from "@sentry/nextjs";
import { isbot } from "isbot";
import type { GetServerSidePropsContext } from "next";

import { getRoutedUrl, hasEmbedPath } from "@calcom/features/routing-forms/lib/getRoutedUrl";
import logger from "@calcom/lib/logger";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["router/getServerSideProps"] });

// Show a positive message to the bots so that they don't think that the form is broken.
const BOT_MESSAGE = "Thank you for your interest! We will be in touch soon.";

export const getServerSideProps = wrapGetServerSidePropsWithSentry(async function getServerSideProps(
  context: GetServerSidePropsContext
) {
  try {
    // Check if the request is from a bot
    const userAgent = context.req.headers["user-agent"];
    if (userAgent && isbot(userAgent)) {
      log.info(`[BOT] Ignoring request from user agent: ${userAgent}`);
      return {
        props: {
          isEmbed: hasEmbedPath(context.req.url || ""),
          form: null,
          message: BOT_MESSAGE,
          errorMessage: null,
        },
      };
    }

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
