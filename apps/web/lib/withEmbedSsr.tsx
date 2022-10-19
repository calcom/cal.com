import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";

export type EmbedProps = {
  isEmbed?: boolean;
};

export default function withEmbedSsr(getServerSideProps: GetServerSideProps) {
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<EmbedProps>> => {
    const ssrResponse = await getServerSideProps(context);
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
