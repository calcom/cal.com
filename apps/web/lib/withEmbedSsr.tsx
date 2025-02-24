import type { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";

import { WebAppURL } from "@calcom/lib/WebAppURL";

export type EmbedProps = {
  isEmbed?: boolean;
};

export default function withEmbedSsr(getServerSideProps: GetServerSideProps) {
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<EmbedProps>> => {
    const ssrResponse = await getServerSideProps(context);
    const embed = context.query.embed;
    const layout = context.query.layout;

    if ("redirect" in ssrResponse) {
      const destinationUrl = ssrResponse.redirect.destination;
      let urlPrefix = "";

      // Get the URL parsed from URL so that we can reliably read pathname and searchParams from it.
      const destinationUrlObj = new WebAppURL(ssrResponse.redirect.destination);

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
      return {
        ...ssrResponse,
        redirect: {
          ...ssrResponse.redirect,
          destination: newDestinationUrl,
        },
      };
    }

    if (!("props" in ssrResponse)) {
      return ssrResponse;
    }

    return {
      ...ssrResponse,
      props: {
        ...ssrResponse.props,
        isEmbed: true,
      },
    };
  };
}
