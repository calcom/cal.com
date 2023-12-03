import type { NextApiRequest, NextApiResponse } from "next";

import { emailActions } from "@calcom/emails/email-manager";
import type { EmailAction } from "@calcom/emails/email-manager";
import { verifySignatureIfQStash } from "@calcom/lib/queue";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("sending email");

  // No need to parse JSON as middleware will do it for us
  const action: EmailAction = req.body.action;
  const params: any[] = req.body.params;

  const actionFunction = emailActions[action];
  // call the action function
  // we ignore the type error but could be fixed with proper typing
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
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
