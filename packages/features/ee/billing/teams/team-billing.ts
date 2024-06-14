import type { Team } from "@prisma/client";

export type TeamBillingInput = Pick<Team, "id" | "parentId" | "metadata" | "isOrganization">;
export interface TeamBilling {
  cancel(): Promise<void>;
  downgrade(): Promise<void>;
  updateQuantity(): Promise<void>;
}
