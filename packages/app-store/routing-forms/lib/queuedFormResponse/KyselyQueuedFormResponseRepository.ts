import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  QueuedFormResponseRepositoryFindManyArgs,
  QueuedFormResponseRepositoryFindManyResult,
  QueuedFormResponseRepositoryFindManyWhere,
  QueuedFormResponseRepositoryInterface,
} from "./QueuedFormResponseRepository.interface";

export class KyselyQueuedFormResponseRepository implements QueuedFormResponseRepositoryInterface {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  private assertWhereIsNotEmpty(where: QueuedFormResponseRepositoryFindManyWhere) {
    let found = false;
    Object.entries(where).forEach(([_, value]) => {
      if (value !== undefined) {
        found = true;
      }
    });
    if (!found) {
      throw new Error("where is empty");
    }
  }

  async findMany({
    where,
    params,
  }: QueuedFormResponseRepositoryFindManyArgs): Promise<QueuedFormResponseRepositoryFindManyResult[]> {
    this.assertWhereIsNotEmpty(where);

    let query = this.dbRead
      .selectFrom("App_RoutingForms_QueuedFormResponse")
      .select([
        "id",
        "formId",
        "response",
        "chosenRouteId",
        "createdAt",
        "updatedAt",
        "actualResponseId",
      ]);

    if (where.actualResponseId !== undefined) {
      if (where.actualResponseId === null) {
        query = query.where("actualResponseId", "is", null);
      } else {
        query = query.where("actualResponseId", "=", where.actualResponseId);
      }
    }

    if (where.createdAt?.lt) {
      query = query.where("createdAt", "<", where.createdAt.lt);
    }

    if (params?.take) {
      query = query.limit(params.take);
    }

    const results = await query.execute();

    return results.map((row) => ({
      id: row.id,
      formId: row.formId,
      response: row.response,
      chosenRouteId: row.chosenRouteId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      actualResponseId: row.actualResponseId,
    }));
  }

  async deleteByIds(ids: string[]): Promise<{ count: number }> {
    if (ids.length === 0) {
      return { count: 0 };
    }

    const result = await this.dbWrite
      .deleteFrom("App_RoutingForms_QueuedFormResponse")
      .where("id", "in", ids)
      .execute();

    return { count: Number(result[0]?.numDeletedRows ?? 0) };
  }
}
