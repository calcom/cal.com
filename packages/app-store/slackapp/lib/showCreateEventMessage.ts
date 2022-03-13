import { WebClient } from "@slack/web-api";
import { NextApiRequest, NextApiResponse } from "next";

import { WhereCredsEqualsId } from "./WhereCredsEqualsID";
import { CreateEventModal, NoUserMessage } from "./views";

export default async function showCreateEventMessage(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;

  const data = await prisma.credential.findFirst({
    ...WhereCredsEqualsId(body.user_id),
    include: {
      user: {
        select: {
          username: true,
          eventTypes: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!data) return res.status(200).json(NoUserMessage);
  const slackCredentials = data?.key; // Only one slack credential for user
  // @ts-ignore access_token must exist on slackCredentials otherwise we have wouldnt have reached this endpoint
  const access_token = slackCredentials?.access_token;
  const slackClient = new WebClient(access_token);
  await slackClient.views.open({
    trigger_id: body.trigger_id,
    view: CreateEventModal(data),
  });
  res.status(200).end();
}
