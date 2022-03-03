import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { showCreateEventMessage } from "../lib";

export enum SlackAppCommands {
  CREATE_EVENT = "create-event",
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const command = req.body.command.split("/").pop();

    switch (command) {
      case SlackAppCommands.CREATE_EVENT:
        return await showCreateEventMessage(req, res);
      default:
        return res.status(404).json({ message: `Command not found` });
    }
  }
  res.status(400).json({ message: "Invalid request" });
}
