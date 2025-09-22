import type { PrismaClient } from "@calcom/prisma";

import { EventTypeCreateService } from "../base/EventTypeCreateService";
import type { EventTypeCreateContext, EventTypeCreateData } from "../base/EventTypeCreateService";
import { EventTypePermissionService } from "../permissions/EventTypePermissionService";

/**
 * Service for creating personal event types (non-team)
 */
export class PersonalEventTypeCreateService extends EventTypeCreateService {
  private permissionService: EventTypePermissionService;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.permissionService = new EventTypePermissionService(prisma);
  }

  /**
   * Validate permissions for personal event type creation
   */
  protected async validatePermissions(context: EventTypeCreateContext): Promise<void> {
    await this.permissionService.validateCreatePermissions({
      userId: context.userId,
      organizationId: context.organizationId,
      isOrgAdmin: context.isOrgAdmin,
      isSystemAdmin: context.userRole === "ADMIN",
    });
  }

  /**
   * Prepare data for personal event type
   */
  protected async prepareData(
    context: EventTypeCreateContext,
    data: EventTypeCreateData
  ): Promise<EventTypeCreateData> {
    // For personal event types, ensure owner is connected
    if (!data.data.owner) {
      data.data.owner = { connect: { id: context.userId } };
    }

    // Ensure users are connected for personal event types
    if (!data.data.users) {
      data.data.users = { connect: { id: context.userId } };
    }

    return data;
  }
}
