import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const notFound = { notFound: true } as const;
  if (typeof ctx.params?.slug !== "string") return notFound;
  const targetUrl = "https://dashboard.stripe.com/settings/connect";
  return {
    redirect: {
      destination: targetUrl,
      permanent: false,
    },
  };
};
