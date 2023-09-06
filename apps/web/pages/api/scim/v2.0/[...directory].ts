import type { DirectorySyncEvent, DirectorySyncRequest } from "@boxyhq/saml-jackson";
import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";

// This is the handler for the SCIM API requests
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dsyncController } = await jackson();

  const { method, query, body } = req;

  const [directoryId, path, resourceId] = query.directory as string[];

  // Handle the SCIM API requests
  const request: DirectorySyncRequest = {
    method: method as string,
    directoryId,
    resourceId,
    apiSecret: extractAuthToken(req),
    resourceType: path === "Users" ? "users" : "groups",
    body: body ? JSON.parse(body) : undefined,
    query: {
      count: req.query.count ? parseInt(req.query.count as string) : undefined,
      startIndex: req.query.startIndex ? parseInt(req.query.startIndex as string) : undefined,
      filter: req.query.filter as string,
    },
  };

  const { status, data } = await dsyncController.requests.handle(request, handleEvents);

  res.status(status).json(data);
}

// Fetch the auth token from the request headers
export const extractAuthToken = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization || null;

  return authHeader ? authHeader.split(" ")[1] : null;
};

// Handle the SCIM events
const handleEvents = async (event: DirectorySyncEvent) => {
  console.log("Received event", event);
};
