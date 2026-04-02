import { WEBAPP_URL } from "@calcom/lib/constants";
import type { NextApiRequest, NextApiResponse } from "next";
import type { NewCanvas } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { card_creation_options } = req.body;

  if (!card_creation_options) return res.status(400).json({ message: "Missing card_creation_options" });

  const URL = `${WEBAPP_URL}/api/integrations/intercom/get?url=${encodeURIComponent(card_creation_options.submit_booking_url)}`;

  const canvasData: NewCanvas = {
    canvas: {
      content: {
        components: [
          {
            type: "text",
            text: card_creation_options?.invitation_input ?? "Schedule a meeting with me",
            align: "left",
            style: "header",
          },
          {
            type: "button",
            id: "submit-issue-form",
            label: card_creation_options?.booking_button_input ?? "Booking button text",
            style: "primary",
            action: {
              type: "sheet",
              url: URL,
            },
          },
        ],
      },
    },
  };

  return res.status(200).json(canvasData);
}
