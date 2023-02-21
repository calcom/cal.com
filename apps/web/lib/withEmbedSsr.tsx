import type { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";

export type EmbedProps = {
  isEmbed?: boolean;
};

export default function withEmbedSsr(getServerSideProps: GetServerSideProps) {
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<EmbedProps>> => {
    const ssrResponse = await getServerSideProps(context);
    const embed = context.query.embed;

    if ("redirect" in ssrResponse) {
      // Use a dummy URL https://base as the fallback base URL so that URL parsing works for relative URLs as well.
      const destinationUrlObj = new URL(ssrResponse.redirect.destination, "https://base");

      // Make sure that redirect happens to /embed page and pass on embed query param as is for preserving Cal JS API namespace
      const newDestinationUrl =
        destinationUrlObj.pathname +
        "/embed?" +
        destinationUrlObj.searchParams.toString() +
        "&embed=" +
        embed;

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
