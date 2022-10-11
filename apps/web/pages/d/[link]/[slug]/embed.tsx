import { GetServerSidePropsContext } from "next";

import { getServerSideProps as _getServerSideProps } from "../[slug]";

export { default } from "../[slug]";

// Do we really need to use this export approach. This file could have been simply a `isEmbed: context.query.embedType == "string"` prop in the [slug] route
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssrResponse = await _getServerSideProps(context);
  if (ssrResponse.notFound) {
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
