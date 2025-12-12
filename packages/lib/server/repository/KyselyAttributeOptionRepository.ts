import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  AttributeOptionDto,
  AttributeOptionCreateInput,
  IAttributeOptionRepository,
} from "./IAttributeOptionRepository";

export class KyselyAttributeOptionRepository implements IAttributeOptionRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findMany(params: { orgId: number }): Promise<AttributeOptionDto[]> {
    const { orgId } = params;

    const results = await this.dbRead
      .selectFrom("AttributeOption")
      .innerJoin("Attribute", "Attribute.id", "AttributeOption.attributeId")
      .select([
        "AttributeOption.id",
        "AttributeOption.value",
        "AttributeOption.slug",
        "AttributeOption.attributeId",
      ])
      .where("Attribute.teamId", "=", orgId)
      .execute();

    return results.map((row) => ({
      id: row.id,
      value: row.value,
      slug: row.slug,
      attributeId: row.attributeId,
    }));
  }

  async createMany(params: { createManyInput: AttributeOptionCreateInput[] }): Promise<{ count: number }> {
    const { createManyInput } = params;

    if (createManyInput.length === 0) {
      return { count: 0 };
    }

    const values = createManyInput.map((input) => ({
      id: input.id,
      value: input.value,
      slug: input.slug,
      attributeId: input.attributeId,
      isGroup: input.isGroup ?? false,
      contains: input.contains ?? [],
    }));

    const result = await this.dbWrite.insertInto("AttributeOption").values(values).execute();

    return { count: result.length };
  }
}
