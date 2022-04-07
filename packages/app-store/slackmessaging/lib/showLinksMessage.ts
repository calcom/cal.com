import { Prisma } from "@prisma/client";
import { KnownBlock, WebClient } from "@slack/web-api";
import { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { WhereCredsEqualsId } from "./WhereCredsEqualsID";
import { CreateEventModal, NoUserMessage } from "./views";
import ShowLinks from "./views/ShowLinks";

export default async function showLinksMessage(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;

  const data = await prisma.credential.findFirst({
    ...WhereCredsEqualsId(body.user_id),
    include: {
      user: {
        select: {
          username: true,
          eventTypes: {
            where: {
              hidden: false,
            },
            select: {
              slug: true,
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
  const blocks = JSON.parse(ShowLinks(data.user?.eventTypes, data.user?.username ?? "")).blocks;

  slackClient.chat.postMessage({
    channel: body.channel_id,
    text: `${data.user?.username}'s Cal.com Links`,
    //@ts-ignore this doesnt need to be of type Block[] - an object works completely fine
    blocks,
  });

  res.status(200).end();
}
