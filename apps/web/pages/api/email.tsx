import { NextApiRequest, NextApiResponse } from "next";
import * as ReactDOMServer from "react-dom/server";

import { EmailHtml } from "@calcom/emails/src/components/Html";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  req.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  res.write(ReactDOMServer.renderToStaticMarkup(<EmailHtml />));
  res.end();
};

export default handler;
