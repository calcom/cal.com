import type { GetServerSidePropsContext } from "next";

export interface ISlackSetupProps {
  accessToken?: string;
  channelId?: string;
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const notFound = { notFound: true } as const;

  if (typeof ctx.params?.slug !== "string") return notFound;

  return {
    props: {},
  };
};
