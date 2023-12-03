import type { NextApiRequest, NextApiResponse } from "next";

import { emailActions } from "@calcom/emails/email-manager";
import { verifySignatureIfQStash } from "@calcom/lib/queue";

// //type EmailActionFunction = Parameters<(typeof emailActions)[EmailAction]>;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.statusCode = 200;

  console.log("sending email");

  console.log("req.body", req.body);
  console.log("req.body,type", typeof req.body);

  // No need to parse JSON as Next.js does it for us
  const { action, params } = req.body;
  // const { action, params }: { action: EmailAction; params: EmailActionFunction[typeof action] } = JSON.parse(
  //   req.body
  // );
  // const action: EmailAction = req.body.action;
  // const params: any[] = req.body.params;

  console.log("action", action);
  console.log("params", params);

  console.log("emailActions", emailActions);
  console.log("emailActions[action]", emailActions[action]);

  await emailActions[action](params);

  console.log("email sent");
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  res.write("email sent");
  res.end();
};

// This middledleware will make sure that the request is coming from Upstash
// and will parse the body for us, unless QSTASH_URL is localhost
export default verifySignatureIfQStash(handler);

// Do not parse the body for this handler as it needs
// to be parsed by the verifySignatureIfQStash middleware
export const config = {
  api: {
    bodyParser: false,
  },
};
