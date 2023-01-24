import { GetStaticPropsContext } from "next";

import { getStaticProps as _getStaticProps } from ".";

export { default, getStaticPaths } from ".";

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
