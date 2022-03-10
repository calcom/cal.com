import { NextApiRequest, NextApiResponse } from "next";
import { Blocks, Elements, Message } from "slack-block-builder";

import { BASE_URL } from "@calcom/lib/constants";

import { WhereCredsEqualsId } from "./WhereCredsEqualsID";
import { CreateEventModal } from "./views";

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

  if (!data)
    res.status(200).json(
      Message()
        .blocks(
          Blocks.Section({ text: "This slack account is not linked with a cal.com account" }),
          Blocks.Actions().elements(
            Elements.Button({ text: "Cancel", actionId: "cancel" }).danger(),
            Elements.Button({
              text: "Connect",
              actionId: "open.connect.link",
              url: `${BASE_URL}/apps/installed`,
            }).primary()
          )
        )
        .buildToJSON()
    );

  res.status(200).json(CreateEventModal(data));
}
