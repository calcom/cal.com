import type { NextApiRequest, NextApiResponse } from "next";

import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import type { WebhookAction } from "@calcom/features/webhooks/lib/sendPayload";
import { verifySignatureIfQStash } from "@calcom/lib/queue";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("sending webhook");

  // No need to parse JSON as middleware will do it for us
  const action: WebhookAction = req.body.action;
  const params: any[] = req.body.params;

  console.log("action", action);

  // call the action function
  // we ignore the type error but could be fixed with proper typing
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  await sendPayload(...params, false);

  console.log("payload sent");
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
