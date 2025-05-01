import type { DirectorySyncEvent, DirectorySyncRequest } from "@boxyhq/saml-jackson";
import type { Params } from "app/_types";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import handleGroupEvents from "@calcom/features/ee/dsync/lib/handleGroupEvents";
import handleUserEvents from "@calcom/features/ee/dsync/lib/handleUserEvents";
import jackson from "@calcom/features/ee/sso/lib/jackson";
import { DIRECTORY_IDS_TO_LOG } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[scim]"] });

// Extract the auth token from the request headers
const extractAuthToken = (req: NextRequest): string | null => {
  const authHeader = req.headers.get("authorization") || null;
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

const querySchema = z.object({
  directory: z.string().array(),
});

// This is the handler for the SCIM API requests
async function getHandler(request: NextRequest, { params }: { params: Promise<Params> }) {
  return handleScimRequest(request, "GET", params);
}

async function postHandler(request: NextRequest, { params }: { params: Promise<Params> }) {
  return handleScimRequest(request, "POST", params);
}

async function putHandler(request: NextRequest, { params }: { params: Promise<Params> }) {
  return handleScimRequest(request, "PUT", params);
}

async function patchHandler(request: NextRequest, { params }: { params: Promise<Params> }) {
  return handleScimRequest(request, "PATCH", params);
}

async function deleteHandler(request: NextRequest, { params }: { params: Promise<Params> }) {
  return handleScimRequest(request, "DELETE", params);
}

async function handleScimRequest(request: NextRequest, method: string, params: Promise<Params>) {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success || parsed.data.directory.length === 0) {
    return NextResponse.json({ error: "Missing directory parameters" }, { status: 400 });
  }

  const { dsyncController } = await jackson();

  const [directoryId, path, resourceId] = parsed.data.directory;
  const shouldLog = DIRECTORY_IDS_TO_LOG.includes(directoryId);

  const searchParams = request.nextUrl.searchParams;

  if (shouldLog) {
    console.log(
      "SCIM API request",
      safeStringify({
        method,
        url: request.url,
        params: parsed.data.directory,
        searchParams: Object.fromEntries(searchParams.entries()),
        body: request.body
          ? await request
              .clone()
              .json()
              .catch(() => ({}))
          : undefined,
      })
    );
  }

  let body: object | undefined = undefined;
  try {
    body = await request.json().catch(() => undefined);
  } catch (e) {
    log.error(`Error parsing SCIM event for directoryId ${directoryId} with error: ${e}`);
  }

  // Handle the SCIM API requests
  const scimRequest: DirectorySyncRequest = {
    method,
    directoryId,
    resourceId,
    apiSecret: extractAuthToken(request),
    resourceType: path === "Users" ? "users" : "groups",
    body,
    query: {
      count: searchParams.get("count") ? parseInt(searchParams.get("count") as string) : undefined,
      startIndex: searchParams.get("startIndex")
        ? parseInt(searchParams.get("startIndex") as string)
        : undefined,
      filter: searchParams.get("filter") as string,
    },
  };

  const { status, data } = await dsyncController.requests.handle(scimRequest, handleEvents);

  if (shouldLog) {
    console.log(
      "Response to SCIM",
      safeStringify({
        status,
        data,
      })
    );
  }

  return NextResponse.json(data, { status });
}
export const GET = defaultResponderForAppDir(getHandler);
export const POST = defaultResponderForAppDir(postHandler);
export const PATCH = defaultResponderForAppDir(patchHandler);
export const DELETE = defaultResponderForAppDir(deleteHandler);
export const PUT = defaultResponderForAppDir(putHandler);
