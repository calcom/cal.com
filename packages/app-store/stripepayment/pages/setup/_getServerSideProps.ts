import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;
  const targetUrl = "https://dashboard.stripe.com/settings/connect";
  return {
    redirect: {
      destination: targetUrl,
      permanent: false,
    },
  };
};
