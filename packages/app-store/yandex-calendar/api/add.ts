import type { NextApiRequest, NextApiResponse } from "next";

import { setupYandexCalendar } from "./setup";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    // Setup the Yandex Calendar
    case "POST":
      await setupYandexCalendar(req, res);
      break;

    // Return the setup page for the app
    case "GET":
      res.status(200).json({ url: "/apps/yandex-calendar/setup" });
      break;

    // Method not allowed
    default:
      res.status(405).json({ message: "Method not allowed" });
      break;
  }
};

export default handler;
