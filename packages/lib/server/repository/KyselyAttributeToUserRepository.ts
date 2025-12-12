import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  AttributeToUserDto,
  AttributeToUserWithAttributeDto,
  AttributeToUserCreateInput,
  AttributeToUserWhereInput,
  IAttributeToUserRepository,
} from "./IAttributeToUserRepository";

export class KyselyAttributeToUserRepository implements IAttributeToUserRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async createManySkipDuplicates(data: AttributeToUserCreateInput[]): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    const values = data.map((input) => ({
      memberId: input.memberId,
      attributeOptionId: input.attributeOptionId,
    }));

    const result = await this.dbWrite
      .insertInto("AttributeToUser")
      .values(values)
      .onConflict((oc) => oc.doNothing())
      .execute();

    return { count: result.length };
  }

  async deleteMany(where: AttributeToUserWhereInput): Promise<{ count: number }> {
    if (Object.keys(where).length === 0) {
      throw new Error("Empty where clause provided to deleteMany. Potential data loss risk.");
    }

    let query = this.dbWrite.deleteFrom("AttributeToUser");

    if (where.memberId !== undefined) {
      query = query.where("memberId", "=", where.memberId);
    }

    if (where.attributeOptionId !== undefined) {
      query = query.where("attributeOptionId", "=", where.attributeOptionId);
    }

    const result = await query.execute();

    return { count: Number(result[0]?.numDeletedRows ?? 0) };
  }

  async findManyIncludeAttribute(
    where: AttributeToUserWhereInput
  ): Promise<AttributeToUserWithAttributeDto[]> {
    let query = this.dbRead
      .selectFrom("AttributeToUser")
      .innerJoin("AttributeOption", "AttributeOption.id", "AttributeToUser.attributeOptionId")
      .innerJoin("Attribute", "Attribute.id", "AttributeOption.attributeId")
      .select([
        "AttributeToUser.id",
        "AttributeToUser.memberId",
        "AttributeToUser.attributeOptionId",
        "AttributeOption.value as optionValue",
        "AttributeOption.slug as optionSlug",
        "Attribute.id as attributeId",
        "Attribute.name as attributeName",
        "Attribute.slug as attributeSlug",
        "Attribute.type as attributeType",
        "Attribute.teamId as attributeTeamId",
        "Attribute.enabled as attributeEnabled",
        "Attribute.usersCanEditRelation as attributeUsersCanEditRelation",
        "Attribute.isWeightsEnabled as attributeIsWeightsEnabled",
        "Attribute.createdAt as attributeCreatedAt",
        "Attribute.updatedAt as attributeUpdatedAt",
        "Attribute.options as attributeOptions",
      ]);

    if (where.memberId !== undefined) {
      query = query.where("AttributeToUser.memberId", "=", where.memberId);
    }

    if (where.attributeOptionId !== undefined) {
      query = query.where("AttributeToUser.attributeOptionId", "=", where.attributeOptionId);
    }

    const results = await query.execute();

    return results.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      attributeOptionId: row.attributeOptionId,
      attributeOption: {
        attribute: {
          id: row.attributeId,
          name: row.attributeName,
          slug: row.attributeSlug,
          type: row.attributeType,
          teamId: row.attributeTeamId,
          enabled: row.attributeEnabled,
          usersCanEditRelation: row.attributeUsersCanEditRelation,
          isWeightsEnabled: row.attributeIsWeightsEnabled,
          createdAt: row.attributeCreatedAt,
          updatedAt: row.attributeUpdatedAt,
          options: row.attributeOptions,
        },
        value: row.optionValue,
        slug: row.optionSlug,
      },
    }));
  }

  async findManyByOrgMembershipIds(params: { orgMembershipIds: number[] }): Promise<AttributeToUserDto[]> {
    const { orgMembershipIds } = params;

    if (orgMembershipIds.length === 0) {
      return [];
    }

    const results = await this.dbRead
      .selectFrom("AttributeToUser")
      .select(["id", "memberId", "attributeOptionId"])
      .where("memberId", "in", orgMembershipIds)
      .execute();

    return results.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      attributeOptionId: row.attributeOptionId,
    }));
  }
}
