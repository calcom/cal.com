import type { Kysely } from "kysely";
import { v4 as uuidv4 } from "uuid";

import type { KyselyDatabase } from "@calcom/kysely";

import type {
  IProfileRepository,
  ProfileCreateInputDto,
  ProfileDto,
} from "./IProfileRepository";

/**
 * Kysely implementation of ProfileRepository
 * Uses read/write database instances for read replica support
 */
export class KyselyProfileRepository implements IProfileRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  static generateProfileUid(): string {
    return uuidv4();
  }

  private mapToDto(row: Record<string, unknown>): ProfileDto {
    return {
      id: row.id as number,
      uid: row.uid as string,
      userId: row.userId as number,
      organizationId: row.organizationId as number,
      username: row.username as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    };
  }

  async create(data: ProfileCreateInputDto): Promise<ProfileDto> {
    const result = await this.writeDb
      .insertInto("Profile")
      .values({
        uid: data.uid ?? KyselyProfileRepository.generateProfileUid(),
        userId: data.userId,
        organizationId: data.organizationId,
        username: data.username,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToDto(result);
  }

  async findByUserIdAndOrgId(params: {
    userId: number;
    organizationId: number;
  }): Promise<ProfileDto | null> {
    const result = await this.readDb
      .selectFrom("Profile")
      .selectAll()
      .where("userId", "=", params.userId)
      .where("organizationId", "=", params.organizationId)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findByOrgIdAndUsername(params: {
    organizationId: number;
    username: string;
  }): Promise<ProfileDto | null> {
    const result = await this.readDb
      .selectFrom("Profile")
      .selectAll()
      .where("organizationId", "=", params.organizationId)
      .where("username", "=", params.username)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findByUid(uid: string): Promise<ProfileDto | null> {
    const result = await this.readDb
      .selectFrom("Profile")
      .selectAll()
      .where("uid", "=", uid)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findById(id: number): Promise<ProfileDto | null> {
    const result = await this.readDb
      .selectFrom("Profile")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findManyForUser(userId: number): Promise<ProfileDto[]> {
    const results = await this.readDb
      .selectFrom("Profile")
      .selectAll()
      .where("userId", "=", userId)
      .execute();

    return results.map((row) => this.mapToDto(row));
  }

  async findFirstForUserId(userId: number): Promise<ProfileDto | null> {
    const result = await this.readDb
      .selectFrom("Profile")
      .selectAll()
      .where("userId", "=", userId)
      .limit(1)
      .executeTakeFirst();

    return result ? this.mapToDto(result) : null;
  }

  async findManyForOrg(organizationId: number): Promise<ProfileDto[]> {
    const results = await this.readDb
      .selectFrom("Profile")
      .selectAll()
      .where("organizationId", "=", organizationId)
      .execute();

    return results.map((row) => this.mapToDto(row));
  }

  async delete(params: { userId: number; organizationId: number }): Promise<void> {
    await this.writeDb
      .deleteFrom("Profile")
      .where("userId", "=", params.userId)
      .where("organizationId", "=", params.organizationId)
      .execute();
  }

  async deleteMany(params: { userIds: number[] }): Promise<void> {
    if (params.userIds.length === 0) return;

    await this.writeDb
      .deleteFrom("Profile")
      .where("userId", "in", params.userIds)
      .execute();
  }
}
