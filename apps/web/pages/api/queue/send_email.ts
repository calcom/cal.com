import type { NextApiRequest, NextApiResponse } from "next";

import { emailActions } from "@calcom/emails/email-manager";
import type { EmailAction } from "@calcom/emails/email-manager";
import { verifySignatureIfQStash } from "@calcom/lib/queue";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("sending email");

  console.log("req.body", req.body);
  console.log("req.body,type", typeof req.body);

  // No need to parse JSON as middleware will do it for us
  const action: EmailAction = req.body.action;
  const params: any[] = req.body.params;

  console.log("action", action);
  console.log("params", params);

  console.log("emailActions", emailActions);
  console.log("emailActions[action]", emailActions[action]);

  const actionFunction = emailActions[action];
  // call the action function
  await actionFunction(...params, false);

  console.log("email sent");
  return res.status(200).json({ message: `${action} completed` });
};

// This middledleware will make sure that the request is coming from Upstash
// and will parse the body for us, unless QSTASH_URL is localhost we will only parse it
export default verifySignatureIfQStash(handler);

// Do not parse the body for this handler as it needs
// to be parsed by the verifySignatureIfQStash middleware
export const config = {
  api: {
    bodyParser: false,
  },
};
