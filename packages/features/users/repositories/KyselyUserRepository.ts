import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";

import type { IUserRepository, UserBasicDto, UserDto } from "./IUserRepository";

/**
 * Kysely implementation of UserRepository
 * Uses read/write database instances for read replica support
 */
export class KyselyUserRepository implements IUserRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  private mapToUserDto(row: Record<string, unknown>): UserDto {
    return {
      id: row.id as number,
      username: row.username as string | null,
      name: row.name as string | null,
      email: row.email as string,
      emailVerified: row.emailVerified as Date | null,
      bio: row.bio as string | null,
      avatarUrl: row.avatarUrl as string | null,
      timeZone: row.timeZone as string,
      startTime: row.startTime as number,
      endTime: row.endTime as number,
      weekStart: row.weekStart as string,
      bufferTime: row.bufferTime as number,
      hideBranding: row.hideBranding as boolean,
      theme: row.theme as string | null,
      createdDate: row.createdDate as Date,
      trialEndsAt: row.trialEndsAt as Date | null,
      completedOnboarding: row.completedOnboarding as boolean,
      locale: row.locale as string | null,
      timeFormat: row.timeFormat as number | null,
      twoFactorSecret: row.twoFactorSecret as string | null,
      twoFactorEnabled: row.twoFactorEnabled as boolean,
      backupCodes: row.backupCodes as string | null,
      identityProviderId: row.identityProviderId as string | null,
      invitedTo: row.invitedTo as number | null,
      brandColor: row.brandColor as string | null,
      darkBrandColor: row.darkBrandColor as string | null,
      allowDynamicBooking: row.allowDynamicBooking as boolean,
      allowSEOIndexing: row.allowSEOIndexing as boolean,
      receiveMonthlyDigestEmail: row.receiveMonthlyDigestEmail as boolean,
      requiresBookerEmailVerification: row.requiresBookerEmailVerification as boolean,
      verified: row.verified as boolean | null,
      disableImpersonation: row.disableImpersonation as boolean,
      locked: row.locked as boolean,
      movedToProfileId: row.movedToProfileId as number | null,
      metadata: row.metadata,
      isPlatformManaged: row.isPlatformManaged as boolean,
      lastActiveAt: row.lastActiveAt as Date | null,
      identityProvider: row.identityProvider as string | null,
    };
  }

  async findById(params: { id: number }): Promise<UserDto | null> {
    const user = await this.readDb
      .selectFrom("User")
      .selectAll()
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!user) return null;
    return this.mapToUserDto(user as unknown as Record<string, unknown>);
  }

  async findByIdOrThrow(params: { id: number }): Promise<UserDto> {
    const user = await this.findById(params);
    if (!user) {
      throw new Error(`User with id ${params.id} not found`);
    }
    return user;
  }

  async findByEmail(params: { email: string }): Promise<UserDto | null> {
    const user = await this.readDb
      .selectFrom("User")
      .selectAll()
      .where("email", "=", params.email.toLowerCase())
      .executeTakeFirst();

    if (!user) return null;
    return this.mapToUserDto(user as unknown as Record<string, unknown>);
  }

  async findByUuid(params: { uuid: string }): Promise<UserBasicDto | null> {
    const user = await this.readDb
      .selectFrom("User")
      .select(["id", "username", "name", "email", "avatarUrl", "timeZone", "locale"])
      .where("uuid", "=", params.uuid)
      .executeTakeFirst();

    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      timeZone: user.timeZone,
      locale: user.locale,
    };
  }

  async findByIds(params: { ids: number[] }): Promise<UserDto[]> {
    if (params.ids.length === 0) return [];

    const users = await this.readDb
      .selectFrom("User")
      .selectAll()
      .where("id", "in", params.ids)
      .execute();

    return users.map((user) => this.mapToUserDto(user as unknown as Record<string, unknown>));
  }

  async findByIdWithUsername(params: { id: number }): Promise<{ id: number; username: string | null } | null> {
    const user = await this.readDb
      .selectFrom("User")
      .select(["id", "username"])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
    };
  }

  async getTimeZoneAndDefaultScheduleId(params: {
    userId: number;
  }): Promise<{ timeZone: string; defaultScheduleId: number | null } | null> {
    const user = await this.readDb
      .selectFrom("User")
      .select(["timeZone", "defaultScheduleId"])
      .where("id", "=", params.userId)
      .executeTakeFirst();

    if (!user) return null;
    return {
      timeZone: user.timeZone,
      defaultScheduleId: user.defaultScheduleId,
    };
  }

  async updateWhereId(params: { id: number; data: Partial<UserDto> }): Promise<UserDto> {
    const updateData: Record<string, unknown> = {};

    // Map DTO fields to database columns
    if (params.data.username !== undefined) updateData.username = params.data.username;
    if (params.data.name !== undefined) updateData.name = params.data.name;
    if (params.data.email !== undefined) updateData.email = params.data.email;
    if (params.data.emailVerified !== undefined) updateData.emailVerified = params.data.emailVerified;
    if (params.data.bio !== undefined) updateData.bio = params.data.bio;
    if (params.data.avatarUrl !== undefined) updateData.avatarUrl = params.data.avatarUrl;
    if (params.data.timeZone !== undefined) updateData.timeZone = params.data.timeZone;
    if (params.data.startTime !== undefined) updateData.startTime = params.data.startTime;
    if (params.data.endTime !== undefined) updateData.endTime = params.data.endTime;
    if (params.data.weekStart !== undefined) updateData.weekStart = params.data.weekStart;
    if (params.data.bufferTime !== undefined) updateData.bufferTime = params.data.bufferTime;
    if (params.data.hideBranding !== undefined) updateData.hideBranding = params.data.hideBranding;
    if (params.data.theme !== undefined) updateData.theme = params.data.theme;
    if (params.data.completedOnboarding !== undefined)
      updateData.completedOnboarding = params.data.completedOnboarding;
    if (params.data.locale !== undefined) updateData.locale = params.data.locale;
    if (params.data.timeFormat !== undefined) updateData.timeFormat = params.data.timeFormat;
    if (params.data.brandColor !== undefined) updateData.brandColor = params.data.brandColor;
    if (params.data.darkBrandColor !== undefined) updateData.darkBrandColor = params.data.darkBrandColor;
    if (params.data.allowDynamicBooking !== undefined)
      updateData.allowDynamicBooking = params.data.allowDynamicBooking;
    if (params.data.allowSEOIndexing !== undefined) updateData.allowSEOIndexing = params.data.allowSEOIndexing;
    if (params.data.receiveMonthlyDigestEmail !== undefined)
      updateData.receiveMonthlyDigestEmail = params.data.receiveMonthlyDigestEmail;
    if (params.data.requiresBookerEmailVerification !== undefined)
      updateData.requiresBookerEmailVerification = params.data.requiresBookerEmailVerification;
    if (params.data.disableImpersonation !== undefined)
      updateData.disableImpersonation = params.data.disableImpersonation;
    if (params.data.metadata !== undefined) updateData.metadata = params.data.metadata;

    await this.writeDb.updateTable("User").set(updateData).where("id", "=", params.id).execute();

    const updated = await this.findByIdOrThrow({ id: params.id });
    return updated;
  }
}
