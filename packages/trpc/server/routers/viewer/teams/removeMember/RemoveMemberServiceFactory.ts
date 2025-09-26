import type { IRemoveMemberService } from "./IRemoveMemberService";
import { PBACRemoveMemberService } from "./PBACRemoveMemberService";

export class RemoveMemberServiceFactory {
  /**
   * Creates the appropriate RemoveMemberService - always returns PBAC service
   */
  static async create(): Promise<IRemoveMemberService> {
    return new PBACRemoveMemberService();
  }
}
