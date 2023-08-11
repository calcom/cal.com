import type { NextApiRequest, NextApiResponse } from "next";

import type { NewCanvas } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { card_creation_options } = req.body;

  if (!card_creation_options) return res.status(400).json({ message: "Missing card_creation_options" });

  const URL = card_creation_options.submit_booking_url;

  const canvasData: NewCanvas = {
    canvas: {
      content: {
        components: [
          {
            type: "button",
            id: "submit-issue-form",
            label: "Book a meeting",
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
