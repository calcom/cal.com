import { GetServerSidePropsContext } from "next";

import { getServerSideProps as _getServerSideProps } from "../[slug]";

export { default } from "../[slug]";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssrResponse = await _getServerSideProps(context);
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
