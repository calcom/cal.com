export type KeyVariant = "TEST" | "LIVE";
export type BillingType = "PER_BOOKING" | "PER_USER" | "LEGACY";

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Deployment types
export interface ListDeploymentsParams extends PaginationParams {
  billingEmail?: string;
  customerId?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  hasActiveKeys?: boolean;
}

export interface Deployment {
  id: string;
  billingEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  _count: { keys: number };
}

export interface ListDeploymentsResponse {
  data: Deployment[];
  meta: PaginationMeta;
}

// Key types
export interface UsageLimits {
  id: string;
  billingType: BillingType;
  entityCount: number;
  entityPrice: number;
  overages: number;
}

export interface DeploymentKey {
  id: string;
  deploymentId: string;
  keyVariant: KeyVariant;
  key: string;
  active: boolean;
  skipVerification: boolean;
  subscriptionId: string | null;
  lastPolledDate: string | null;
  usageLimitsId: string | null;
  usageLimits: UsageLimits | null;
}

export interface GetKeysResponse {
  data: DeploymentKey[];
  meta: PaginationMeta;
}

// Usage types
export interface UsageRecord {
  id: string;
  keyId: string;
  date: string;
  count: number;
}

export interface UsageRecordWithKey extends UsageRecord {
  Key: {
    id: string;
    key: string;
    keyVariant: KeyVariant;
    deploymentId: string;
  };
}

export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

export interface GetDeploymentUsageResponse {
  data: UsageRecordWithKey[];
}

export interface GetKeyUsageResponse {
  data: UsageRecord[];
}

// Signature regeneration
export interface RegenerateSignatureResponse {
  data: {
    signature: string;
    message: string;
  };
}

// Error types
export interface AdminApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
