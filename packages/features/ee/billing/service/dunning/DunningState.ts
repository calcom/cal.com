import type { RawDunningRecord } from "../../repository/dunning/IDunningRepository";

export type DunningEntityType = "team" | "organization";

export type BlockableAction =
  | "INVITE_MEMBER"
  | "CREATE_EVENT_TYPE"
  | "CREATE_BOOKING"
  | "API_ACCESS";

export type DunningPolicy = {
  SOFT_BLOCKED: BlockableAction[];
  HARD_BLOCKED: BlockableAction[];
  CANCELLED: BlockableAction[];
};

export type DunningStatus =
  | "CURRENT"
  | "WARNING"
  | "SOFT_BLOCKED"
  | "HARD_BLOCKED"
  | "CANCELLED";

export const SOFT_BLOCK_DAYS = 7;
export const HARD_BLOCK_DAYS = 14;
export const CANCEL_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DUNNING_TRANSITIONS: Array<{
  from: DunningStatus;
  to: DunningStatus;
  afterDays: number;
}> = [
  { from: "HARD_BLOCKED", to: "CANCELLED", afterDays: CANCEL_DAYS },
  { from: "WARNING", to: "HARD_BLOCKED", afterDays: HARD_BLOCK_DAYS },
  { from: "SOFT_BLOCKED", to: "HARD_BLOCKED", afterDays: HARD_BLOCK_DAYS },
  { from: "WARNING", to: "SOFT_BLOCKED", afterDays: SOFT_BLOCK_DAYS },
];

const SEVERITY: Record<DunningStatus, number> = {
  CURRENT: 0,
  WARNING: 1,
  SOFT_BLOCKED: 2,
  HARD_BLOCKED: 3,
  CANCELLED: 4,
};

export interface DunningStateData {
  id: string;
  billingId: string;
  entityType: DunningEntityType;
  status: DunningStatus;
  firstFailedAt: Date | null;
  lastFailedAt: Date | null;
  resolvedAt: Date | null;
  subscriptionId: string | null;
  failedInvoiceId: string | null;
  invoiceUrl: string | null;
  failureReason: string | null;
  notificationsSent: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DunningState {
  readonly id: string;
  readonly billingId: string;
  readonly entityType: DunningEntityType;
  readonly status: DunningStatus;
  readonly firstFailedAt: Date | null;
  readonly lastFailedAt: Date | null;
  readonly resolvedAt: Date | null;
  readonly subscriptionId: string | null;
  readonly failedInvoiceId: string | null;
  readonly invoiceUrl: string | null;
  readonly failureReason: string | null;
  readonly notificationsSent: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(data: DunningStateData) {
    this.id = data.id;
    this.billingId = data.billingId;
    this.entityType = data.entityType;
    this.status = data.status;
    this.firstFailedAt = data.firstFailedAt;
    this.lastFailedAt = data.lastFailedAt;
    this.resolvedAt = data.resolvedAt;
    this.subscriptionId = data.subscriptionId;
    this.failedInvoiceId = data.failedInvoiceId;
    this.invoiceUrl = data.invoiceUrl;
    this.failureReason = data.failureReason;
    this.notificationsSent = data.notificationsSent;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromRecord(
    raw: RawDunningRecord,
    entityType: DunningEntityType
  ): DunningState {
    return new DunningState({
      id: raw.id,
      billingId: raw.billingFk,
      entityType,
      status: raw.status,
      firstFailedAt: raw.firstFailedAt,
      lastFailedAt: raw.lastFailedAt,
      resolvedAt: raw.resolvedAt,
      subscriptionId: raw.subscriptionId,
      failedInvoiceId: raw.failedInvoiceId,
      invoiceUrl: raw.invoiceUrl,
      failureReason: raw.failureReason,
      notificationsSent: raw.notificationsSent,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static initial(
    billingId: string,
    entityType: DunningEntityType
  ): DunningState {
    const now = new Date();
    return new DunningState({
      id: "",
      billingId,
      entityType,
      status: "CURRENT",
      firstFailedAt: null,
      lastFailedAt: null,
      resolvedAt: null,
      subscriptionId: null,
      failedInvoiceId: null,
      invoiceUrl: null,
      failureReason: null,
      notificationsSent: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  private with(overrides: Partial<DunningStateData>): DunningState {
    return new DunningState({
      id: this.id,
      billingId: this.billingId,
      entityType: this.entityType,
      status: this.status,
      firstFailedAt: this.firstFailedAt,
      lastFailedAt: this.lastFailedAt,
      resolvedAt: this.resolvedAt,
      subscriptionId: this.subscriptionId,
      failedInvoiceId: this.failedInvoiceId,
      invoiceUrl: this.invoiceUrl,
      failureReason: this.failureReason,
      notificationsSent: this.notificationsSent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...overrides,
    });
  }

  get isInDunning(): boolean {
    return this.status !== "CURRENT";
  }

  get severity(): number {
    return SEVERITY[this.status];
  }

  static severityOf(status: DunningStatus): number {
    return SEVERITY[status];
  }

  recordPaymentFailure(params: {
    subscriptionId: string;
    failedInvoiceId: string;
    invoiceUrl: string | null;
    failureReason: string;
  }): { state: DunningState; isNewDunningRecord: boolean } {
    const now = new Date();
    const isCurrent = this.status === "CURRENT";
    const isNewDunningRecord = this.id === "" || isCurrent;
    const status: DunningStatus =
      !isCurrent && this.id !== "" ? this.status : "WARNING";
    const firstFailedAt =
      !isCurrent && this.id !== "" ? this.firstFailedAt : now;

    return {
      state: this.with({
        status,
        firstFailedAt,
        lastFailedAt: now,
        resolvedAt: null,
        subscriptionId: params.subscriptionId,
        failedInvoiceId: params.failedInvoiceId,
        invoiceUrl: params.invoiceUrl,
        failureReason: params.failureReason,
      }),
      isNewDunningRecord,
    };
  }

  resolve(): DunningState {
    return this.with({
      status: "CURRENT",
      resolvedAt: new Date(),
      failedInvoiceId: null,
      invoiceUrl: null,
    });
  }

  advance(
    now: Date
  ): { state: DunningState; from: DunningStatus; to: DunningStatus } | null {
    if (this.status === "CURRENT") return null;
    if (!this.firstFailedAt) return null;

    const daysSinceFirstFailure =
      (now.getTime() - this.firstFailedAt.getTime()) / MS_PER_DAY;

    const transition = DUNNING_TRANSITIONS.find(
      (t) => t.from === this.status && daysSinceFirstFailure >= t.afterDays
    );

    if (!transition) return null;

    return {
      state: this.with({ status: transition.to }),
      from: this.status,
      to: transition.to,
    };
  }

  isActionBlocked(action: BlockableAction, policy: DunningPolicy): boolean {
    // We typecast here as status cant be current for blockedActions
    const blockedActions =
      policy[this.status as "SOFT_BLOCKED" | "HARD_BLOCKED" | "CANCELLED"];
    if (!blockedActions) return false;
    return blockedActions.includes(action);
  }
}
