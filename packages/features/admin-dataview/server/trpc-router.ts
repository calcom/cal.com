import { z } from "zod";

import { getAdminDataViewService, getAdminTableRegistry } from "../di/container";

const ZListInput = z.object({
  slug: z.string(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortField: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
});

const ZGetByIdInput = z.object({
  slug: z.string(),
  id: z.union([z.string(), z.number()]),
});

const ZReverseRelationsInput = z.object({
  slug: z.string(),
  id: z.union([z.string(), z.number()]),
});

const ZReverseRelationListInput = z.object({
  sourceSlug: z.string(),
  fkColumn: z.string(),
  fkValue: z.union([z.string(), z.number()]),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export function createAdminDataViewRouter(
  router: typeof import("@calcom/trpc/server/trpc").router,
  authedAdminProcedure: typeof import("@calcom/trpc/server/procedures/authedProcedure").authedAdminProcedure
) {
  return router({
    tables: authedAdminProcedure.query(() => {
      return getAdminTableRegistry().getAll().map((t) => ({
        modelName: t.modelName,
        displayName: t.displayName,
        displayNamePlural: t.displayNamePlural,
        description: t.description,
        slug: t.slug,
        category: t.category,
      }));
    }),

    schema: authedAdminProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => {
        const table = getAdminTableRegistry().getBySlug(input.slug);
        if (!table) throw new Error(`Unknown table: ${input.slug}`);
        return table.def;
      }),

    list: authedAdminProcedure.input(ZListInput).query(async ({ input }) => {
      const service = getAdminDataViewService();
      return service.list(input);
    }),

    getById: authedAdminProcedure.input(ZGetByIdInput).query(async ({ input }) => {
      const service = getAdminDataViewService();
      return service.getById(input);
    }),

    reverseRelations: authedAdminProcedure.input(ZReverseRelationsInput).query(({ input }) => {
      return getAdminTableRegistry().getReverseRelations(input.slug).map((r) => ({
        sourceSlug: r.sourceTable.slug,
        sourceModelName: r.sourceTable.modelName,
        sourceDisplayNamePlural: r.sourceTable.displayNamePlural,
        fkColumn: r.sourceField.column,
        label: r.label,
      }));
    }),

    reverseRelationList: authedAdminProcedure.input(ZReverseRelationListInput).query(async ({ input }) => {
      const service = getAdminDataViewService();
      return service.list({
        slug: input.sourceSlug,
        page: input.page,
        pageSize: input.pageSize,
        filters: { [input.fkColumn]: input.fkValue },
      });
    }),
  });
}
