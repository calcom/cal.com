import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  CredentialCreateInputDto,
  CredentialDto,
  CredentialForCalendarServiceDto,
  CredentialUpdateInputDto,
  CredentialWithAppDto,
  CredentialWithDelegationDto,
  CredentialWithUserDto,
  ICredentialRepository,
} from "./ICredentialRepository";

export class KyselyCredentialRepository implements ICredentialRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async create(data: CredentialCreateInputDto): Promise<CredentialDto> {
    const result = await this.writeDb
      .insertInto("Credential")
      .values({
        type: data.type,
        key: JSON.stringify(data.key),
        userId: data.userId,
        appId: data.appId,
        delegationCredentialId: data.delegationCredentialId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async findByAppIdAndUserId(appId: string, userId: number): Promise<CredentialDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .selectAll()
      .where("appId", "=", appId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findFirstByIdWithUser(id: number): Promise<CredentialDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .select([
        "Credential.id",
        "Credential.type",
        "Credential.userId",
        "Credential.teamId",
        "Credential.appId",
        "Credential.subscriptionId",
        "Credential.paymentStatus",
        "Credential.billingCycleStart",
        "Credential.invalid",
        "Credential.delegationCredentialId",
      ])
      .where("Credential.id", "=", id)
      .executeTakeFirst();

    if (!result) return null;

    return {
      ...result,
      key: null,
    } as CredentialDto;
  }

  async findFirstByIdWithKeyAndUser(id: number): Promise<CredentialDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findFirstByAppIdAndUserId(appId: string, userId: number): Promise<CredentialDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .selectAll()
      .where("appId", "=", appId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findFirstByUserIdAndType(userId: number, type: string): Promise<CredentialDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .selectAll()
      .where("userId", "=", userId)
      .where("type", "=", type)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async deleteById(id: number): Promise<void> {
    await this.writeDb.deleteFrom("Credential").where("id", "=", id).execute();
  }

  async updateCredentialById(id: number, data: CredentialUpdateInputDto): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.key !== undefined) updateData.key = JSON.stringify(data.key);
    if (data.userId !== undefined) updateData.userId = data.userId;
    if (data.appId !== undefined) updateData.appId = data.appId;
    if (data.delegationCredentialId !== undefined)
      updateData.delegationCredentialId = data.delegationCredentialId;
    if (data.invalid !== undefined) updateData.invalid = data.invalid;

    await this.writeDb.updateTable("Credential").set(updateData).where("id", "=", id).execute();
  }

  async deleteAllByDelegationCredentialId(delegationCredentialId: string): Promise<{ count: number }> {
    const result = await this.writeDb
      .deleteFrom("Credential")
      .where("delegationCredentialId", "=", delegationCredentialId)
      .executeTakeFirst();

    return { count: Number(result.numDeletedRows) };
  }

  async findCredentialForCalendarServiceById(id: number): Promise<CredentialForCalendarServiceDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .leftJoin("users", "users.id", "Credential.userId")
      .select([
        "Credential.id",
        "Credential.type",
        "Credential.key",
        "Credential.userId",
        "Credential.teamId",
        "Credential.appId",
        "Credential.invalid",
        "users.email as userEmail",
      ])
      .where("Credential.id", "=", id)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      type: result.type,
      key: result.key,
      userId: result.userId,
      teamId: result.teamId,
      appId: result.appId,
      invalid: result.invalid,
      user: result.userEmail ? { email: result.userEmail } : null,
    };
  }

  async findByIdIncludeDelegationCredential(id: number): Promise<CredentialWithDelegationDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .leftJoin("users", "users.id", "Credential.userId")
      .leftJoin("DelegationCredential", "DelegationCredential.id", "Credential.delegationCredentialId")
      .select([
        "Credential.id",
        "Credential.type",
        "Credential.key",
        "Credential.userId",
        "Credential.teamId",
        "Credential.appId",
        "Credential.subscriptionId",
        "Credential.paymentStatus",
        "Credential.billingCycleStart",
        "Credential.invalid",
        "Credential.delegationCredentialId",
        "DelegationCredential.id as dcId",
        "DelegationCredential.domain as dcDomain",
        "DelegationCredential.serviceAccountKey as dcServiceAccountKey",
        "DelegationCredential.organizationId as dcOrganizationId",
        "DelegationCredential.workspacePlatformId as dcWorkspacePlatformId",
        "DelegationCredential.enabled as dcEnabled",
      ])
      .where("Credential.id", "=", id)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      type: result.type,
      key: result.key,
      userId: result.userId,
      teamId: result.teamId,
      appId: result.appId,
      subscriptionId: result.subscriptionId,
      paymentStatus: result.paymentStatus,
      billingCycleStart: result.billingCycleStart,
      invalid: result.invalid,
      delegationCredentialId: result.delegationCredentialId,
      delegationCredential: result.dcId
        ? {
            id: result.dcId,
            domain: result.dcDomain!,
            serviceAccountKey: result.dcServiceAccountKey,
            organizationId: result.dcOrganizationId!,
            workspacePlatformId: result.dcWorkspacePlatformId,
            enabled: result.dcEnabled!,
          }
        : null,
    };
  }

  async findAllDelegationByUserIdsListAndDelegationCredentialIdAndType(
    userIds: number[],
    delegationCredentialId: string,
    type: string
  ): Promise<{ userId: number | null }[]> {
    const results = await this.readDb
      .selectFrom("Credential")
      .select(["userId"])
      .where("userId", "in", userIds)
      .where("delegationCredentialId", "=", delegationCredentialId)
      .where("type", "=", type)
      .execute();

    return results;
  }

  async findAllDelegationByTypeIncludeUserAndTake(
    type: string,
    take: number
  ): Promise<(CredentialWithUserDto & { delegationCredentialId: string })[]> {
    const results = await this.readDb
      .selectFrom("Credential")
      .leftJoin("users", "users.id", "Credential.userId")
      .selectAll("Credential")
      .select(["users.id as uId", "users.email as uEmail"])
      .where("delegationCredentialId", "is not", null)
      .where("type", "=", type)
      .limit(take)
      .execute();

    return results.map((r) => ({
      id: r.id,
      type: r.type,
      key: r.key,
      userId: r.userId,
      teamId: r.teamId,
      appId: r.appId,
      subscriptionId: r.subscriptionId,
      paymentStatus: r.paymentStatus,
      billingCycleStart: r.billingCycleStart,
      invalid: r.invalid,
      delegationCredentialId: r.delegationCredentialId!,
      user: r.uId ? { id: r.uId, email: r.uEmail! } : null,
    }));
  }

  async findUniqueByUserIdAndDelegationCredentialId(
    userId: number,
    delegationCredentialId: string
  ): Promise<CredentialDto | null> {
    const results = await this.readDb
      .selectFrom("Credential")
      .selectAll()
      .where("userId", "=", userId)
      .where("delegationCredentialId", "=", delegationCredentialId)
      .execute();

    if (results.length > 1) {
      console.error(`DelegationCredential: Multiple delegation user credentials found - this should not happen`, {
        userId,
        delegationCredentialId,
      });
    }

    return results[0] ? this.mapToDto(results[0]) : null;
  }

  async updateWhereUserIdAndDelegationCredentialId(
    userId: number,
    delegationCredentialId: string,
    data: { key: unknown }
  ): Promise<{ count: number }> {
    const result = await this.writeDb
      .updateTable("Credential")
      .set({ key: JSON.stringify(data.key) })
      .where("userId", "=", userId)
      .where("delegationCredentialId", "=", delegationCredentialId)
      .executeTakeFirst();

    return { count: Number(result.numUpdatedRows) };
  }

  async createDelegationCredential(data: {
    userId: number;
    delegationCredentialId: string;
    type: string;
    key: unknown;
    appId: string;
  }): Promise<CredentialDto> {
    const result = await this.writeDb
      .insertInto("Credential")
      .values({
        userId: data.userId,
        delegationCredentialId: data.delegationCredentialId,
        type: data.type,
        key: JSON.stringify(data.key),
        appId: data.appId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async updateWhereId(id: number, data: { key: unknown }): Promise<CredentialDto> {
    const result = await this.writeDb
      .updateTable("Credential")
      .set({ key: JSON.stringify(data.key) })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async findPaymentCredentialByAppIdAndTeamId(
    appId: string | null,
    teamId: number
  ): Promise<CredentialWithAppDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .leftJoin("App", "App.slug", "Credential.appId")
      .selectAll("Credential")
      .select(["App.slug as appSlug", "App.categories as appCategories", "App.dirName as appDirName"])
      .where("Credential.teamId", "=", teamId)
      .where("Credential.appId", appId === null ? "is" : "=", appId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      ...this.mapToDto(result),
      app: result.appSlug
        ? {
            slug: result.appSlug,
            categories: result.appCategories as string[],
            dirName: result.appDirName!,
          }
        : null,
    };
  }

  async findPaymentCredentialByAppIdAndUserId(
    appId: string | null,
    userId: number
  ): Promise<CredentialWithAppDto | null> {
    const result = await this.readDb
      .selectFrom("Credential")
      .leftJoin("App", "App.slug", "Credential.appId")
      .selectAll("Credential")
      .select(["App.slug as appSlug", "App.categories as appCategories", "App.dirName as appDirName"])
      .where("Credential.userId", "=", userId)
      .where("Credential.appId", appId === null ? "is" : "=", appId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      ...this.mapToDto(result),
      app: result.appSlug
        ? {
            slug: result.appSlug,
            categories: result.appCategories as string[],
            dirName: result.appDirName!,
          }
        : null,
    };
  }

  async findPaymentCredentialByAppIdAndUserIdOrTeamId(
    appId: string | null,
    userId: number,
    teamId?: number | null
  ): Promise<CredentialWithAppDto | null> {
    let query = this.readDb
      .selectFrom("Credential")
      .leftJoin("App", "App.slug", "Credential.appId")
      .selectAll("Credential")
      .select(["App.slug as appSlug", "App.categories as appCategories", "App.dirName as appDirName"])
      .where("Credential.appId", appId === null ? "is" : "=", appId);

    if (teamId) {
      query = query.where("Credential.teamId", "=", teamId);
    } else {
      query = query.where("Credential.userId", "=", userId);
    }

    const result = await query.executeTakeFirst();

    if (!result) return null;

    return {
      ...this.mapToDto(result),
      app: result.appSlug
        ? {
            slug: result.appSlug,
            categories: result.appCategories as string[],
            dirName: result.appDirName!,
          }
        : null,
    };
  }

  private mapToDto(row: {
    id: number;
    type: string;
    key: unknown;
    userId: number | null;
    teamId: number | null;
    appId: string | null;
    subscriptionId: string | null;
    paymentStatus: string | null;
    billingCycleStart: number | null;
    invalid: boolean | null;
    delegationCredentialId: string | null;
  }): CredentialDto {
    return {
      id: row.id,
      type: row.type,
      key: row.key,
      userId: row.userId,
      teamId: row.teamId,
      appId: row.appId,
      subscriptionId: row.subscriptionId,
      paymentStatus: row.paymentStatus,
      billingCycleStart: row.billingCycleStart,
      invalid: row.invalid,
      delegationCredentialId: row.delegationCredentialId,
    };
  }
}
