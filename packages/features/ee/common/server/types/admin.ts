// Deployment Types
export type Deployment = {
  id: string;
  billingEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  customerId: string | null;
  keys: LicenseKey[];
};

export type LicenseKey = {
  id: string;
  deploymentId: string;
  keyVariant: "TEST" | "LIVE";
  key: string;
  active: boolean;
  skipVerification: boolean;
  subscriptionId: string | null;
  lastPolledDate: string | null; // ISO date string
  usageLimits: UsageLimits | null;
};

export type UsageLimits = {
  id: string;
  billingType: "PER_BOOKING" | "PER_USER" | "LEGACY";
  entityCount: number;
  entityPrice: number;
  overages: number;
};

export type PaginatedDeployments = {
  data: Deployment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

// Request Types
export type ListDeploymentsQuery = {
  page?: number;
  pageSize?: number;
  billingEmail?: string;
  customerId?: string;
  keyActive?: boolean;
  createdAfter?: string; // ISO date string
  createdBefore?: string; // ISO date string
};

export type UpdateDeploymentRequest = {
  billingEmail?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
  signature?: string;
};

export type UpdateKeyRequest = {
  active?: boolean;
  skipVerification?: boolean;
  subscriptionId?: string;
  usageLimits?: {
    entityCount?: number;
    entityPrice?: number;
    overages?: number;
  };
};

// Response Types
export type StripeCustomerInfo =
  | {
      id: string;
      email: string | null;
      name: string | null;
      metadata: Record<string, string>;
      created: number;
    }
  | {
      id: string;
      deleted: true;
    }
  | null; // null if no customerId on deployment

export type StripeSubscription = {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  items: Array<{
    id: string;
    priceId: string;
    quantity: number | null;
  }>;
};

export type DeploymentStripeInfo = {
  customer: StripeCustomerInfo;
  subscriptions: StripeSubscription[];
};

export type KeyStripeInfo = {
  subscription:
    | (StripeSubscription & {
        customer: string | Record<string, unknown>;
      })
    | null;
};

export type SendLicenseEmailResponse = {
  success: boolean;
  message: string;
};
