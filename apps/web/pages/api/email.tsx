import { NextApiRequest, NextApiResponse } from "next";

import { renderEmail } from "@calcom/emails";
import { EmailHtml } from "@calcom/emails/src/components/EmailHtml";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  req.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  res.write(renderEmail(<EmailHtml />));
  res.end();
};

export default handler;
