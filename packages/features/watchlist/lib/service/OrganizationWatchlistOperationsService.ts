import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import type { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { MembershipRole } from "@calcom/prisma/enums";

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
};

export interface OrganizationAddReportsToWatchlistInput extends AddReportsToWatchlistInput {
  organizationId: number;
}

export interface OrganizationCreateWatchlistEntryInput extends CreateWatchlistEntryInput {
  organizationId: number;
}

export interface OrganizationDeleteWatchlistEntryInput extends DeleteWatchlistEntryInput {
  organizationId: number;
}

type OrganizationInput =
  | OrganizationAddReportsToWatchlistInput
  | OrganizationCreateWatchlistEntryInput
  | OrganizationDeleteWatchlistEntryInput;

function isOrganizationInput(
  input: AddReportsToWatchlistInput | CreateWatchlistEntryInput | DeleteWatchlistEntryInput
): input is OrganizationInput {
  return (
    "organizationId" in input &&
    input.organizationId !== undefined &&
    typeof input.organizationId === "number"
  );
}

export class OrganizationWatchlistOperationsService extends WatchlistOperationsService {
  private readonly permissionCheckService: PermissionCheckService;
  private currentOrganizationId: number | null = null;

  constructor(deps: Deps) {
    super(deps);
    this.permissionCheckService = deps.permissionCheckService;
  }

  protected getScope(
    input: AddReportsToWatchlistInput | CreateWatchlistEntryInput | DeleteWatchlistEntryInput
  ): WatchlistOperationsScope {
    if (!isOrganizationInput(input)) {
      throw new Error("You must be part of an organization to manage watchlist");
    }

    this.currentOrganizationId = input.organizationId;

    return {
      organizationId: input.organizationId,
      isGlobal: false,
    };
  }

  protected async validateReports(
    reportIds: string[]
  ): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>> {
    if (!this.currentOrganizationId) {
      throw new Error("Organization ID must be set before calling validateReports");
    }

    const reports = await this.deps.bookingReportRepo.findReportsByIds({
      reportIds,
      organizationId: this.currentOrganizationId,
    });

    return reports;
  }

  private async checkPermission(userId: number, organizationId: number, permission: string): Promise<void> {
    const hasPermission = await this.permissionCheckService.checkPermission({
      userId,
      teamId: organizationId,
      permission,
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw new Error(`You are not authorized to ${permission.split(".")[1]} watchlist entries`);
    }
  }

  async addReportsToWatchlist(
    input: OrganizationAddReportsToWatchlistInput
  ): Promise<AddReportsToWatchlistResult> {
    await this.checkPermission(input.userId, input.organizationId, "watchlist.create");
    return super.addReportsToWatchlist(input);
  }

  async createWatchlistEntry(
    input: OrganizationCreateWatchlistEntryInput
  ): Promise<CreateWatchlistEntryResult> {
    await this.checkPermission(input.userId, input.organizationId, "watchlist.create");
    return super.createWatchlistEntry(input);
  }

  async deleteWatchlistEntry(
    input: OrganizationDeleteWatchlistEntryInput
  ): Promise<DeleteWatchlistEntryResult> {
    await this.checkPermission(input.userId, input.organizationId, "watchlist.delete");
    return super.deleteWatchlistEntry(input);
  }

  async addReportsToWatchlistInternal(
    input: OrganizationAddReportsToWatchlistInput
  ): Promise<AddReportsToWatchlistResult> {
    await this.checkPermission(input.userId, input.organizationId, "watchlist.create");
    return super.addReportsToWatchlist(input);
  }
}
