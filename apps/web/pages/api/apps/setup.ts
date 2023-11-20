import type { NextApiRequest, NextApiResponse } from "next";

export const AppSetupPageMap = {
  alby: import("@calcom/app-store/alby/pages/setup/_getServerSideProps"),
  make: import("@calcom/app-store/make/pages/setup/_getServerSideProps"),
  zapier: import("@calcom/app-store/zapier/pages/setup/_getServerSideProps"),
  stripe: import("@calcom/app-store/stripepayment/pages/setup/_getServerSideProps"),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { slug } = JSON.parse(req.body) as { slug?: keyof typeof AppSetupPageMap };

    if (!slug) return res.status(400).json({ error: "Missing slug" });

    const page = await AppSetupPageMap[slug];

    if (!page.getServerSideProps) {
      return res.writeHead(404).end();
    }

    const props = await page.getServerSideProps(req, res);

    res.status(200).json(props);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
}
