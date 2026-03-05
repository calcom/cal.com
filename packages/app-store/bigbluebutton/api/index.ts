import type { NextApiRequest, NextApiResponse } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { createMeeting, deleteMeeting, updateMeeting } from "./lib/VideoApiAdapter";

/**
 * BigBlueButton API Handler
 * 
 * Security fix: Return 405 for unsupported HTTP methods instead of 500
 */

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return 405 for unsupported methods instead of throwing 500
  if (req.method !== "POST" && req.method !== "DELETE" && req.method !== "PUT") {
    return res.status(405).json({ 
      error: "Method Not Allowed",
      message: `HTTP method ${req.method} is not supported. Use POST, PUT, or DELETE.`
    });
  }

  try {
    switch (req.method) {
      case "POST":
        return await handleCreate(req, res);
      case "PUT":
        return await handleUpdate(req, res);
      case "DELETE":
        return await handleDelete(req, res);
      default:
        // This should never reach here due to check above
        return res.status(405).json({ error: "Method Not Allowed" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return res.status(500).json({ error: message });
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  const { event } = req.body;
  
  if (!event) {
    return res.status(400).json({ error: "Event data is required" });
  }

  const meeting = await createMeeting(event);
  return res.status(201).json({ meeting });
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  const { id, event } = req.body;
  
  if (!id || !event) {
    return res.status(400).json({ error: "Meeting ID and event data are required" });
  }

  const meeting = await updateMeeting(id, event);
  return res.status(200).json({ meeting });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: "Meeting ID is required" });
  }

  await deleteMeeting(id);
  return res.status(200).json({ success: true });
}

export default defaultResponder(handler);
