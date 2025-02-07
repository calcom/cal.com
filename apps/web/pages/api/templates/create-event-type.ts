import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { eventTypes } from "@calcom/web/lib/templates/event-types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession({ req, res });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    const { eventTypeId, slug } = req.body;

    if (!eventTypeId || !slug) {
      return res.status(400).json({ message: "Missing required fields: eventTypeId or slug" });
    }

    const templateEventType = eventTypes.find((eventType: any) =>
      eventType.id ? eventType.id === eventType.id : slugify(eventType.name) === slug
    );

    if (!templateEventType) {
      return res.status(404).json({ message: "Template event type not found" });
    }

    const newEventType = await prisma.eventType.create({
      data: {
        title: templateEventType.template.title,
        slug: templateEventType.template.slug,
        description: templateEventType.template.description,
        length: templateEventType.template.length,
        userId: session.user.id,
        users: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });

    console.log(session.user.id);

    return res.status(200).json(newEventType);
  } catch (error) {
    console.error("Error creating event type:", error);
    return res.status(500).json({
      message: "Error creating event type",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
