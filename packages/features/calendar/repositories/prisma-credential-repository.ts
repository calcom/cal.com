import type {
  CredentialRepository,
  TokenRefresher,
} from "@calcom/features/calendar/repositories/credential-repository";
import type { CalendarCredentialWithDelegation } from "@calcom/features/calendar/types";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["PrismaCredentialRepository"] });

/** 5 seconds before expiry — refresh proactively */
const EXPIRY_BUFFER_MS = 5000;

const KNOWN_CALENDAR_TYPES = [
  "google_calendar",
  "office365_calendar",
  "caldav_calendar",
  "apple_calendar",
  "proton_calendar",
  "exchange_calendar",
  "feishu_calendar",
  "lark_calendar",
  "zoho_calendar",
  "ics_feed_calendar",
];

export class PrismaCredentialRepository implements CredentialRepository {
  constructor(
    private prismaClient: PrismaClient,
    private tokenRefresher?: TokenRefresher
  ) {}

  async resolve(
    selectedCalendar: Pick<
      { id: string; credentialId: number | null; delegationCredentialId: string | null },
      "id" | "credentialId" | "delegationCredentialId"
    >
  ): Promise<CalendarCredentialWithDelegation> {
    if (!selectedCalendar.credentialId && !selectedCalendar.delegationCredentialId) {
      throw ErrorWithCode.Factory.NotFound(
        `SelectedCalendar ${selectedCalendar.id} has no credentialId or delegationCredentialId`
      );
    }

    const credential = selectedCalendar.credentialId
      ? await this.prismaClient.credential.findUnique({
          where: { id: selectedCalendar.credentialId },
          select: { id: true, type: true, key: true },
        })
      : await this.prismaClient.credential.findFirst({
          where: { delegationCredentialId: selectedCalendar.delegationCredentialId! },
          select: { id: true, type: true, key: true },
        });

    if (!credential) {
      const lookupId = selectedCalendar.credentialId ?? selectedCalendar.delegationCredentialId;
      throw ErrorWithCode.Factory.NotFound(
        `Credential ${lookupId} not found for SelectedCalendar ${selectedCalendar.id}`
      );
    }

    if (!KNOWN_CALENDAR_TYPES.includes(credential.type)) {
      throw ErrorWithCode.Factory.BadRequest(
        `Unknown calendar provider type: ${credential.type} (credentialId=${credential.id})`
      );
    }

    if (!credential.key || typeof credential.key !== "object") {
      throw ErrorWithCode.Factory.BadRequest(
        `Credential ${credential.id} has invalid key (expected object, got ${typeof credential.key})`
      );
    }
    const key = credential.key as Record<string, unknown>;
    const refreshedKey = await this.refreshIfExpiring(credential.id, credential.type, key);

    return {
      id: credential.id,
      type: credential.type,
      key: refreshedKey,
      // Carry the delegation UUID so callers can match by delegation key
      ...(selectedCalendar.delegationCredentialId
        ? { delegationCredentialId: selectedCalendar.delegationCredentialId }
        : {}),
    } as CalendarCredentialWithDelegation;
  }

  async invalidate(id: number): Promise<void> {
    await this.prismaClient.credential.update({
      where: { id },
      data: { invalid: true },
      select: { id: true },
    });
  }

  private async refreshIfExpiring(
    credentialId: number,
    type: string,
    key: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!this.tokenRefresher) return key;

    const expiryDate = key.expiry_date as number | undefined;
    if (!expiryDate) return key;

    const isExpiring = expiryDate - EXPIRY_BUFFER_MS <= Date.now();
    if (!isExpiring) return key;

    log.info("Token expiring, refreshing", { credentialId, type });

    try {
      const refreshedKey = await this.tokenRefresher.refresh(credentialId, type, key);

      await this.prismaClient.credential.update({
        where: { id: credentialId },
        data: { key: refreshedKey as Record<string, unknown> },
        select: { id: true },
      });

      return refreshedKey;
    } catch (err) {
      log.error("Token refresh failed", {
        credentialId,
        error: err instanceof Error ? err.message : String(err),
      });
      return key;
    }
  }
}
