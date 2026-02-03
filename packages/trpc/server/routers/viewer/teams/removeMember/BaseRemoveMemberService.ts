import { TeamService } from "@calcom/features/ee/teams/services/teamService";

import type {
  IRemoveMemberService,
  RemoveMemberContext,
  RemoveMemberPermissionResult,
} from "./IRemoveMemberService";

/**
 * Base abstract class for remove member services
 * Provides common functionality and defines abstract methods for specific implementations
 */
export abstract class BaseRemoveMemberService implements IRemoveMemberService {
  abstract checkRemovePermissions(context: RemoveMemberContext): Promise<RemoveMemberPermissionResult>;

  abstract validateRemoval(context: RemoveMemberContext, hasPermission: boolean): Promise<void>;

  async removeMembers(memberIds: number[], teamIds: number[], isOrg: boolean): Promise<void> {
    await TeamService.removeMembers({ teamIds, userIds: memberIds, isOrg });
  }
}
