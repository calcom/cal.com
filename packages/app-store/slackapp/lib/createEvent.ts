import { NextApiRequest, NextApiResponse } from "next";

import { CreateEventModal } from "./views";

export default async function createEvents(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;

  const data = await prisma.credential.findFirst({
    where: {
      type: "slack_app",
      key: {
        path: ["authed_user", "id"],
        equals: body.user_id,
      },
    },
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

  if (!data) res.status(200).json({ message: "No user found" });

  res.status(200).json(CreateEventModal(data));
}
