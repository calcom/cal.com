import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "querystring";

import createEvent from "../lib/actions/createEvent";

enum InteractionEvents {
  CREATE_EVENT = "cal.event.create",
}
function parseBody(body: any) {
  const parsedBody = parse(body);
  if (parsedBody.payload) {
    // @ts-ignore - This should never be the case
    return JSON.parse(parsedBody.payload);
  }
  return parsedBody;
}
export default async function interactiveHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const body = parseBody(req.body);

    // I've not found a case where actions is ever > than 1 when this function is called.
    switch (actions?.action_id) {
      case InteractionEvents.CREATE_EVENT:
        return await createEvent(req, res);
      default:
        res.status(200).end(); // Techincally an invalid request but we don't want to return an throw an error to slack - 200 just does nothing
    }
  }
  res.status(200).end(); // Send 200 if we dont have a case for the action_id
}
