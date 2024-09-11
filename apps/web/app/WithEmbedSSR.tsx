import type { GetServerSidePropsContext } from "next";
import { isNotFoundError } from "next/dist/client/components/not-found";
import { getURLFromRedirectError, isRedirectError } from "next/dist/client/components/redirect";
import { notFound, redirect } from "next/navigation";

import { WebAppURL } from "@calcom/lib/WebAppURL";

export type EmbedProps = {
  isEmbed?: boolean;
};

export default function withEmbedSsrAppDir<T extends Record<string, any>>(
  getData: (context: GetServerSidePropsContext) => Promise<T>
) {
  return async (context: GetServerSidePropsContext): Promise<T> => {
    const { embed, layout } = context.query;
    const isCOEPEnabled = context.query["flag.coep"] === "true";
    if (isCOEPEnabled) {
      context.res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    }
    try {
      const props = await getData(context);

      return {
        ...props,
        isEmbed: true,
      };
    } catch (e) {
      if (isRedirectError(e)) {
        const destinationUrl = getURLFromRedirectError(e);
        let urlPrefix = "";

        // Get the URL parsed from URL so that we can reliably read pathname and searchParams from it.
        const destinationUrlObj = new WebAppURL(destinationUrl);

        // If it's a complete URL, use the origin as the prefix to ensure we redirect to the same domain.
        if (destinationUrl.search(/^(http:|https:).*/) !== -1) {
          urlPrefix = destinationUrlObj.origin;
        } else {
          // Don't use any prefix for relative URLs to ensure we stay on the same domain
          urlPrefix = "";
        }

        const destinationQueryStr = destinationUrlObj.searchParams.toString();
        // Make sure that redirect happens to /embed page and pass on embed query param as is for preserving Cal JS API namespace
        const newDestinationUrl = `${urlPrefix}${destinationUrlObj.pathname}/embed?${
          destinationQueryStr ? `${destinationQueryStr}&` : ""
        }layout=${layout}&embed=${embed}`;

        redirect(newDestinationUrl);
      }

      if (isNotFoundError(e)) {
        notFound();
      }

      throw e;
    }
  };
}
