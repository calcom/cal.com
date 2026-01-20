import type { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import type { PermissionString } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import { MembershipRole } from "@calcom/prisma/enums";

import { WatchlistErrors } from "../errors/WatchlistErrors";
import type {
  AddReportsToWatchlistInput,
  AddReportsToWatchlistResult,
  CreateWatchlistEntryInput,
  CreateWatchlistEntryResult,
  DeleteWatchlistEntryInput,
  DeleteWatchlistEntryResult,
  WatchlistOperationsScope,
} from "./WatchlistOperationsService";
import { WatchlistOperationsService } from "./WatchlistOperationsService";

type Deps = {
  watchlistRepo: WatchlistRepository;
  bookingReportRepo: PrismaBookingReportRepository;
  permissionCheckService: PermissionCheckService;
  organizationId: number;
};

export class OrganizationWatchlistOperationsService extends WatchlistOperationsService {
  private readonly permissionCheckService: PermissionCheckService;
  private readonly organizationId: number;

  constructor(deps: Deps) {
    super(deps);
    this.permissionCheckService = deps.permissionCheckService;
    this.organizationId = deps.organizationId;
  }

  protected getScope(): WatchlistOperationsScope {
    return {
      organizationId: this.organizationId,
      isGlobal: false,
    };
  }

  protected async findReports(
    reportIds: string[]
  ): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>> {
    const reports = await this.deps.bookingReportRepo.findReportsByIds({
      reportIds,
      organizationId: this.organizationId,
    });

    return reports;
  }

  private async checkPermission(userId: number, permission: PermissionString): Promise<void> {
    const hasPermission = await this.permissionCheckService.checkPermission({
      userId,
      teamId: this.organizationId,
      permission,
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw WatchlistErrors.permissionDenied(
        `You are not authorized to ${permission.split(".")[1]} watchlist entries`
      );
    }
  }

  async addReportsToWatchlist(input: AddReportsToWatchlistInput): Promise<AddReportsToWatchlistResult> {
    await this.checkPermission(input.userId, "watchlist.create");
    return super.addReportsToWatchlist(input);
  }

  async createWatchlistEntry(input: CreateWatchlistEntryInput): Promise<CreateWatchlistEntryResult> {
    await this.checkPermission(input.userId, "watchlist.create");
    return super.createWatchlistEntry(input);
  }

  async deleteWatchlistEntry(input: DeleteWatchlistEntryInput): Promise<DeleteWatchlistEntryResult> {
    await this.checkPermission(input.userId, "watchlist.delete");
    return super.deleteWatchlistEntry(input);
  }
}
