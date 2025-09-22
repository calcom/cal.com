import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { EventTypeCreateService } from "../base/EventTypeCreateService";
import type { EventTypeCreateContext, EventTypeCreateData } from "../base/EventTypeCreateService";
import { EventTypePermissionService } from "../permissions/EventTypePermissionService";

/**
 * Service for creating team event types
 */
export class TeamEventTypeCreateService extends EventTypeCreateService {
  private permissionService: EventTypePermissionService;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.permissionService = new EventTypePermissionService(prisma);
  }

  /**
   * Validate permissions for team event type creation
   */
  protected async validatePermissions(context: EventTypeCreateContext): Promise<void> {
    if (!context.teamId) {
      throw new Error("Team ID is required for team event type creation");
    }

    await this.permissionService.validateCreatePermissions({
      userId: context.userId,
      teamId: context.teamId,
      organizationId: context.organizationId,
      isOrgAdmin: context.isOrgAdmin,
      isSystemAdmin: context.userRole === "ADMIN",
    });
  }

  /**
   * Prepare data for team event type
   */
  protected async prepareData(
    context: EventTypeCreateContext,
    data: EventTypeCreateData
  ): Promise<EventTypeCreateData> {
    if (!context.teamId) {
      throw new Error("Team ID is required for team event type creation");
    }

    // For team event types, remove owner connection
    data.data.owner = undefined;

    // Handle managed event types
    const isManagedEventType = data.data.schedulingType === SchedulingType.MANAGED;
    if (isManagedEventType || data.data.schedulingType) {
      data.data.users = undefined;
    }

    // Add team connection
    data.data.team = {
      connect: {
        id: context.teamId,
      },
    };

    return data;
  }
}
