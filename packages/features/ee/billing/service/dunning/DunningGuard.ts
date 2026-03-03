import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import logger from "@calcom/lib/logger";

import type { BlockableAction, DunningPolicy, DunningStatus } from "./DunningState";
import type { DunningServiceFactory } from "./DunningServiceFactory";

const log = logger.getSubLogger({ prefix: ["DunningGuard"] });

export const DEFAULT_DUNNING_POLICY: DunningPolicy = {
  SOFT_BLOCKED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE"],
  HARD_BLOCKED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE", "CREATE_BOOKING", "API_ACCESS"],
  CANCELLED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE", "CREATE_BOOKING", "API_ACCESS"],
};

const STRATEGY_DUNNING_POLICIES: Record<string, DunningPolicy> = {
  MonthlyProration: {
    SOFT_BLOCKED: ["INVITE_MEMBER"],
    HARD_BLOCKED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE"],
    CANCELLED: ["INVITE_MEMBER", "CREATE_EVENT_TYPE", "CREATE_BOOKING", "API_ACCESS"],
  },
};

export interface DunningCheckResult {
  allowed: boolean;
  reason?: string;
  dunningStatus?: DunningStatus;
  invoiceUrl?: string | null;
}

export interface IDunningGuardDeps {
  dunningServiceFactory: DunningServiceFactory;
  featuresRepository: IFeaturesRepository;
  enterpriseSlugs: string[];
  seatBillingStrategyFactory: {
    createByTeamId: (teamId: number) => Promise<{ strategyName: string }>;
  };
  teamRepository: {
    findTeamSlugById: (
      args: { id: number }
    ) => Promise<{ slug: string | null; parentId: number | null } | null>;
  };
}

const REASON_MAP: Record<BlockableAction, string> = {
  INVITE_MEMBER: "dunning_blocked_invite",
  CREATE_EVENT_TYPE: "dunning_blocked_event_type",
  CREATE_BOOKING: "dunning_blocked_booking",
  API_ACCESS: "dunning_blocked_api",
};

export class DunningGuard {
  constructor(private deps: IDunningGuardDeps) {}

  async canPerformAction(teamId: number, action: BlockableAction): Promise<DunningCheckResult> {
    const isEnabled =
      await this.deps.featuresRepository.checkIfFeatureIsEnabledGlobally("dunning-enforcement");

    if (!isEnabled) {
      return { allowed: true };
    }

    const team = await this.deps.teamRepository.findTeamSlugById({ id: teamId });
    const billingTeamId = team?.parentId ?? teamId;

    const billingTeam =
      billingTeamId === teamId
        ? team
        : await this.deps.teamRepository.findTeamSlugById({ id: billingTeamId });

    const resolved = await this.deps.dunningServiceFactory.forTeam(billingTeamId);
    if (!resolved) {
      return { allowed: true };
    }

    const record = await resolved.service.findRecord(resolved.billingId);
    if (!record || record.status === "CURRENT" || record.status === "WARNING") {
      return { allowed: true };
    }

    if (billingTeam?.slug && this.deps.enterpriseSlugs.includes(billingTeam.slug)) {
      return { allowed: true };
    }

    const policy = await this.resolvePolicy(billingTeamId);

    if (record.isActionBlocked(action, policy)) {
      return {
        allowed: false,
        reason: REASON_MAP[action],
        dunningStatus: record.status,
        invoiceUrl: record.invoiceUrl,
      };
    }

    return {
      allowed: true,
      dunningStatus: record.status,
    };
  }

  private async resolvePolicy(teamId: number): Promise<DunningPolicy> {
    try {
      const strategy = await this.deps.seatBillingStrategyFactory.createByTeamId(teamId);
      return STRATEGY_DUNNING_POLICIES[strategy.strategyName] ?? DEFAULT_DUNNING_POLICY;
    } catch (error) {
      log.warn("Failed to resolve billing strategy for dunning policy, using default", { teamId, error });
      return DEFAULT_DUNNING_POLICY;
    }
  }
}
