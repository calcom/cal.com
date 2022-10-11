import { GetServerSidePropsContext } from "next";

import { getServerSideProps as _getServerSideProps } from "../[user]";

export { default } from "../[user]";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  console.log("EMBED, [user]/embed");
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
