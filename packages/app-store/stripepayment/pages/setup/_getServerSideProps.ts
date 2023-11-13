import type { NextApiRequest, NextApiResponse } from "next";

export const getServerSideProps = async (_req: NextApiRequest, _res: NextApiResponse) => {
  const targetUrl = "https://dashboard.stripe.com/settings/connect";
  return {
    redirect: {
      destination: targetUrl,
      permanent: false,
    },
  };
};
