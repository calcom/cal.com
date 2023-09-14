import type { GetServerSidePropsContext } from "next";

import { getServerSideProps as _getServerSideProps } from "../[type]";

export { default } from "../[type]";

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
