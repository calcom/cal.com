import type { NextApiRequest, NextApiResponse } from "next";

import { showCreateEventMessage, showTodayMessage } from "../lib";
import showLinksMessage from "../lib/showLinksMessage";

export enum SlackAppCommands {
  CREATE_EVENT = "create-event",
  TODAY = "today",
  LINKS = "links",
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const command = req.body.command.split("/").pop();

    switch (command) {
      case SlackAppCommands.CREATE_EVENT:
        return await showCreateEventMessage(req, res);
      case SlackAppCommands.TODAY:
        return await showTodayMessage(req, res);
      case SlackAppCommands.LINKS:
        return await showLinksMessage(req, res);
      default:
        return res.status(404).json({ message: `Command not found` });
    }
  }
  return res.status(400).json({ message: "Invalid request" });
}
