import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import type { AttributeType } from "@calcom/prisma/enums";

import type {
  AttributeWithOptionsDto,
  AttributeWithWeightsDto,
  IAttributeRepository,
} from "./IAttributeRepository";

export class KyselyAttributeRepository implements IAttributeRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findManyByNamesAndOrgIdIncludeOptions(params: {
    attributeNames: string[];
    orgId: number;
  }): Promise<AttributeWithOptionsDto[]> {
    const { attributeNames, orgId } = params;

    // Get attributes with case-insensitive name matching
    const attributes = await this.readDb
      .selectFrom("Attribute")
      .select(["id", "name", "type", "slug"])
      .where("teamId", "=", orgId)
      .where((eb) =>
        eb.or(attributeNames.map((name) => eb("name", "ilike", name)))
      )
      .execute();

    if (attributes.length === 0) return [];

    // Get options for these attributes
    const attributeIds = attributes.map((a) => a.id);
    const options = await this.readDb
      .selectFrom("AttributeOption")
      .select(["id", "value", "slug", "attributeId"])
      .where("attributeId", "in", attributeIds)
      .execute();

    // Map options to attributes
    return attributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      type: attr.type as AttributeType,
      slug: attr.slug,
      options: options
        .filter((opt) => opt.attributeId === attr.id)
        .map((opt) => ({
          id: opt.id,
          value: opt.value,
          slug: opt.slug,
        })),
    }));
  }

  async findManyByOrgId(params: { orgId: number }): Promise<AttributeWithOptionsDto[]> {
    const { orgId } = params;

    const attributes = await this.readDb
      .selectFrom("Attribute")
      .select(["id", "name", "type", "slug"])
      .where("teamId", "=", orgId)
      .execute();

    if (attributes.length === 0) return [];

    // Get options for these attributes
    const attributeIds = attributes.map((a) => a.id);
    const options = await this.readDb
      .selectFrom("AttributeOption")
      .select(["id", "value", "slug", "attributeId"])
      .where("attributeId", "in", attributeIds)
      .execute();

    return attributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      type: attr.type as AttributeType,
      slug: attr.slug,
      options: options
        .filter((opt) => opt.attributeId === attr.id)
        .map((opt) => ({
          id: opt.id,
          value: opt.value,
          slug: opt.slug,
        })),
    }));
  }

  async findAllByOrgIdWithOptions(params: { orgId: number }): Promise<AttributeWithOptionsDto[]> {
    return this.findManyByOrgId(params);
  }

  async findUniqueWithWeights(params: {
    teamId: number;
    attributeId: string;
    isWeightsEnabled?: boolean;
  }): Promise<AttributeWithWeightsDto | null> {
    const { teamId, attributeId, isWeightsEnabled = true } = params;

    const attribute = await this.readDb
      .selectFrom("Attribute")
      .select(["id", "name", "slug", "type"])
      .where("id", "=", attributeId)
      .where("teamId", "=", teamId)
      .where("isWeightsEnabled", "=", isWeightsEnabled)
      .executeTakeFirst();

    if (!attribute) return null;

    // Get options with assigned users and weights
    const options = await this.readDb
      .selectFrom("AttributeOption as ao")
      .leftJoin("AttributeToUser as atu", "atu.attributeOptionId", "ao.id")
      .leftJoin("Membership as m", "m.id", "atu.memberId")
      .select([
        "ao.id",
        "ao.value",
        "ao.slug",
        "m.userId",
        "atu.weight",
      ])
      .where("ao.attributeId", "=", attributeId)
      .execute();

    // Group by option
    const optionMap = new Map<string, {
      id: string;
      value: string;
      slug: string;
      assignedUsers: { member: { userId: number }; weight: number }[];
    }>();

    for (const row of options) {
      if (!optionMap.has(row.id)) {
        optionMap.set(row.id, {
          id: row.id,
          value: row.value,
          slug: row.slug,
          assignedUsers: [],
        });
      }
      if (row.userId !== null && row.weight !== null) {
        optionMap.get(row.id)!.assignedUsers.push({
          member: { userId: row.userId },
          weight: row.weight,
        });
      }
    }

    return {
      id: attribute.id,
      name: attribute.name,
      slug: attribute.slug,
      type: attribute.type as AttributeType,
      options: Array.from(optionMap.values()),
    };
  }
}
