import type { CalendarCredentialWithDelegation } from "@calcom/features/calendar/types";

export interface TokenRefresher {
  refresh(credentialId: number, type: string, key: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface CredentialRepository {
  resolve(
    selectedCalendar: Pick<
      { id: string; credentialId: number | null; delegationCredentialId: string | null },
      "id" | "credentialId" | "delegationCredentialId"
    >
  ): Promise<CalendarCredentialWithDelegation>;
  invalidate(id: number): Promise<void>;
}
