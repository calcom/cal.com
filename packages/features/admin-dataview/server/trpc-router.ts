import { z } from "zod";

import { readonlyPrisma } from "@calcom/prisma";

import { getAdminDataViewService, getAdminTableRegistry } from "../di/container";
import { AdminTriggerRunsService } from "./trigger-runs.service";

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

    billingByTeamId: authedAdminProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input }) => {
        const { teamId } = input;

        const billingSelect = {
          id: true,
          customerId: true,
          subscriptionId: true,
          status: true,
          planName: true,
          billingPeriod: true,
          billingMode: true,
          pricePerSeat: true,
          paidSeats: true,
          minSeats: true,
          highWaterMark: true,
          subscriptionStart: true,
          subscriptionTrialEnd: true,
          subscriptionEnd: true,
          teamId: true,
          createdAt: true,
          updatedAt: true,
          dunningStatus: {
            select: {
              status: true,
              firstFailedAt: true,
              lastFailedAt: true,
              failureReason: true,
              invoiceUrl: true,
              notificationsSent: true,
            },
          },
        } as const;

        const [teamBilling, orgBilling, seatChanges] = await Promise.all([
          readonlyPrisma.teamBilling.findUnique({
            where: { teamId },
            select: billingSelect,
          }),
          readonlyPrisma.organizationBilling.findUnique({
            where: { teamId },
            select: billingSelect,
          }),
          readonlyPrisma.seatChangeLog.findMany({
            where: { teamId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              changeType: true,
              seatCount: true,
              userId: true,
              changeDate: true,
              monthKey: true,
            },
          }),
        ]);

        const billing = teamBilling ?? orgBilling;

        return {
          hasBilling: !!billing,
          entityType: orgBilling ? "organization" : "team",
          billing: billing
            ? {
                id: billing.id,
                customerId: billing.customerId,
                subscriptionId: billing.subscriptionId,
                status: billing.status,
                planName: billing.planName,
                billingPeriod: billing.billingPeriod,
                billingMode: billing.billingMode,
                pricePerSeat: billing.pricePerSeat,
                paidSeats: billing.paidSeats,
                minSeats: billing.minSeats,
                highWaterMark: billing.highWaterMark,
                subscriptionStart: billing.subscriptionStart,
                subscriptionTrialEnd: billing.subscriptionTrialEnd,
                subscriptionEnd: billing.subscriptionEnd,
                createdAt: billing.createdAt,
                updatedAt: billing.updatedAt,
                dunning: billing.dunningStatus
                  ? {
                      status: billing.dunningStatus.status,
                      firstFailedAt: billing.dunningStatus.firstFailedAt,
                      lastFailedAt: billing.dunningStatus.lastFailedAt,
                      failureReason: billing.dunningStatus.failureReason,
                      invoiceUrl: billing.dunningStatus.invoiceUrl,
                      notificationsSent: billing.dunningStatus.notificationsSent,
                    }
                  : null,
              }
            : null,
          seatChanges,
        };
      }),

    triggerRunsByTag: authedAdminProcedure
      .input(
        z.object({
          tag: z.string().min(1).max(256),
          limit: z.number().int().min(1).max(50).default(20),
        })
      )
      .query(async ({ input }) => {
        const triggerService = new AdminTriggerRunsService();
        return triggerService.listByTag(input);
      }),

    replayTriggerRun: authedAdminProcedure
      .input(z.object({ runId: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const triggerService = new AdminTriggerRunsService();
        return triggerService.replay(input.runId);
      }),
  });
}
