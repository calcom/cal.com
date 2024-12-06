import type { DirectorySyncEvent, DirectorySyncRequest } from "@boxyhq/saml-jackson";
import type { NextApiRequest, NextApiResponse } from "next";

import handleGroupEvents from "@calcom/features/ee/dsync/lib/handleGroupEvents";
import handleUserEvents from "@calcom/features/ee/dsync/lib/handleUserEvents";
import jackson from "@calcom/features/ee/sso/lib/jackson";
import { DIRECTORY_IDS_TO_LOG } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[scim]"] });

// This is the handler for the SCIM API requests
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dsyncController } = await jackson();

  const { method, query, body } = req;

  const [directoryId, path, resourceId] = query.directory as string[];
  const shouldLog = DIRECTORY_IDS_TO_LOG.includes(directoryId);
  if (shouldLog) {
    console.log(
      "SCIM API request",
      safeStringify({
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body,
      })
    );
  }
  let responseBody: object | undefined = undefined;
  if (body) {
    try {
      responseBody = JSON.parse(body);
    } catch (e) {
      log.error(`Error parsing SCIM event for directoryId ${directoryId} with error: ${e} and body ${body}`);
    }
  }

  // Handle the SCIM API requests
  const request: DirectorySyncRequest = {
    method: method as string,
    directoryId,
    resourceId,
    apiSecret: extractAuthToken(req),
    resourceType: path === "Users" ? "users" : "groups",
    body: responseBody,
    query: {
      count: req.query.count ? parseInt(req.query.count as string) : undefined,
      startIndex: req.query.startIndex ? parseInt(req.query.startIndex as string) : undefined,
      filter: req.query.filter as string,
    },
  };

  const { status, data } = await dsyncController.requests.handle(request, handleEvents);

  if (shouldLog) {
    console.log(
      "Response to SCIM",
      safeStringify({
        status,
        data,
      })
    );
  }

  res.status(status).json(data);
}

// Fetch the auth token from the request headers
export const extractAuthToken = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization || null;

  return authHeader ? authHeader.split(" ")[1] : null;
};

// Handle the SCIM events
const handleEvents = async (event: DirectorySyncEvent) => {
  log.debug("handleEvents", safeStringify(event));
  const dSyncData = await prisma.dSyncData.findFirst({
    where: {
      directoryId: event.directory_id,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!dSyncData) {
    throw new Error("Directory sync data not found");
  }

  const { organizationId } = dSyncData;

  if (!organizationId) {
    throw new Error(`Org ID not found for dsync ${dSyncData.id}`);
  }

  if (event.event.includes("group")) {
    handleGroupEvents(event, organizationId);
  }

  if (event.event === "user.created" || event.event === "user.updated") {
    await handleUserEvents(event, organizationId);
  }
};
