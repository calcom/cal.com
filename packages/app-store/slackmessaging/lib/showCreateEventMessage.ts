import { Prisma } from "@prisma/client";
import { WebClient } from "@slack/web-api";
import { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { WhereCredsEqualsId } from "./WhereCredsEqualsID";
import slackVerify from "./slackVerify";
import { CreateEventModal, NoUserMessage } from "./views";

export default async function showCreateEventMessage(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;
  await slackVerify(req, res);

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
  const access_token = (slackCredentials as Prisma.JsonObject)?.access_token as string;
  const slackClient = new WebClient(access_token);
  await slackClient.views.open({
    trigger_id: body.trigger_id,
    view: CreateEventModal(data),
  });
  return res.status(200).end();
}
