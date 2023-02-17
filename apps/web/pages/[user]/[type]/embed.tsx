import type { GetStaticPropsContext } from "next";

import { getStaticProps as _getStaticProps } from "../[type]";

export { getStaticPaths } from "../[type]";

export { default } from "../[type]";

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const staticResponse = await _getStaticProps(context);
  if (staticResponse.notFound) {
    return staticResponse;
  }
  return {
    ...staticResponse,
    props: {
      ...staticResponse.props,
      isEmbed: true,
    },
  };
};
