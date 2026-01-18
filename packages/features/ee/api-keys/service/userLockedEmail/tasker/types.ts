import type { LockReason } from "@calcom/features/ee/api-keys/lib/autoLock";

export type UserLockedEmailPayload = {
  userId: number;
  email: string;
  name: string | null;
  lockReason: LockReason;
  locale: string;
};

export interface IUserLockedEmailTasker {
  sendEmail(payload: UserLockedEmailPayload): Promise<{ runId: string }>;
}
