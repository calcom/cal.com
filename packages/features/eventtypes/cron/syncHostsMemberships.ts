import { validateRequest } from "@calcom/lib/cron/validateRequest";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { HostRepository } from "../../host/repositories/HostRepository";
import { EventTypeRepository } from "../repositories/eventTypeRepository";
import { SyncHostsMembershipsService, type SyncResult } from "../services/SyncHostsMembershipsService";

const log = logger.getSubLogger({ prefix: ["cron/syncHostsMemberships"] });

function createSyncHostsMembershipsService(): SyncHostsMembershipsService {
  const eventTypeRepository = new EventTypeRepository(prisma);
  const hostRepository = new HostRepository(prisma);
  return new SyncHostsMembershipsService({
    eventTypeRepository,
    hostRepository,
    logger: log,
  });
}

export async function handleSyncHostsMemberships(request: NextRequest): Promise<NextResponse> {
  const authError = validateRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const service = createSyncHostsMembershipsService();
    const result = await service.syncHostsWithMemberships();

    log.info("Sync hosts memberships cron completed", {
      hostsAdded: result.hostsAdded,
      hostsRemoved: result.hostsRemoved,
      eventTypesProcessed: result.eventTypesProcessed,
    });

    return NextResponse.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    log.error("Error during sync hosts memberships cron:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to sync hosts with memberships" },
      { status: 500 }
    );
  }
}

export { createSyncHostsMembershipsService, type SyncResult };
