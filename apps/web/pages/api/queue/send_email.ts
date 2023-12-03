import { verifySignature } from "@upstash/qstash/dist/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { emailActions } from "@calcom/emails/email-manager";

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

export default verifySignature(handler);

// EXPORT config to tell Next.js NOT to parse the body
export const config = {
  api: {
    bodyParser: false,
  },
};
