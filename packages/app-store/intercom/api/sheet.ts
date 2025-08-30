import type { NextApiRequest, NextApiResponse } from "next";

import type { NewCanvas, TextComponent, SpacerComponent } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sheet_values } = req.body;

  if (!sheet_values) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  const { booking, eventType, organizer } = sheet_values;

  // Prepare date and time information
  const startTime = new Date(booking.startTime);
  const options = {
    weekday: "long" as const,
    year: "numeric" as const,
    month: "long" as const,
    day: "numeric" as const,
    hour: "numeric" as const,
    minute: "numeric" as const,
    timeZone: organizer.timeZone,
    timeZoneName: "short" as const,
  };
  const formattedDate = startTime.toLocaleDateString("en-US", options);

  // Create text components for the recap
  const confirmedText: TextComponent = {
    type: "text",
    text: `Confirmed: ${eventType.title}`,
    style: "header",
    align: "left",
  };

  const detailsText: TextComponent = {
    type: "text",
    text: `You are scheduled with ${organizer.name} on ${formattedDate}`,
    style: "paragraph",
    align: "left",
  };

  const spacer: SpacerComponent = {
    type: "spacer",
    size: "m",
  };

  // Build the canvas data
  const canvasData: NewCanvas = {
    canvas: {
      content: {
        components: [confirmedText, spacer, detailsText],
      },
    },
  };

  return res.status(200).json(canvasData);
}
