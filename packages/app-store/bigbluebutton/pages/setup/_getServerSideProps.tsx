import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  return { props: {} };
};
