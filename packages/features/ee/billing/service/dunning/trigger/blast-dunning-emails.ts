import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import { z } from "zod";
import { dunningTaskConfig } from "./config";
import { sendDunningEmailForStatus } from "./send-dunning-email-for-status";

const blastDunningEmailsSchema = z.object({
  dryRun: z.boolean().default(false),
  excludedTeamIds: z.array(z.number()).default([]),
});

export const BLAST_DUNNING_EMAILS_JOB_ID = "billing.blast-dunning-emails";

const PAGE_SIZE = 500;
const BATCH_SIZE = 100;

/**
 * One-time task to send dunning emails to all teams currently in dunning.
 * Sends the email matching each team's current status without advancing state.
 * Use dryRun: true to preview counts before sending.
 *
 * Paginates DB queries and fans out email sends in batches to handle 10k+ records.
 */
export const blastDunningEmails: TaskWithSchema<
  typeof BLAST_DUNNING_EMAILS_JOB_ID,
  typeof blastDunningEmailsSchema
> = schemaTask({
  id: BLAST_DUNNING_EMAILS_JOB_ID,
  ...dunningTaskConfig,
  schema: blastDunningEmailsSchema,
  run: async (payload: z.infer<typeof blastDunningEmailsSchema>) => {
    const prisma = (await import("@calcom/prisma")).default;

    type Row = { teamId: number; status: string };
    const allRows: Row[] = [];

    let teamCursor: string | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await prisma.teamDunningStatus.findMany({
        where: { status: { not: "CURRENT" }, resolvedAt: null },
        select: {
          id: true,
          status: true,
          teamBilling: { select: { teamId: true } },
        },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(teamCursor ? { skip: 1, cursor: { id: teamCursor } } : {}),
      });

      if (page.length === 0) break;
      for (const r of page) {
        allRows.push({ teamId: r.teamBilling.teamId, status: r.status });
      }
      teamCursor = page[page.length - 1].id;
      if (page.length < PAGE_SIZE) break;
    }

    let orgCursor: string | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await prisma.organizationDunningStatus.findMany({
        where: { status: { not: "CURRENT" }, resolvedAt: null },
        select: {
          id: true,
          status: true,
          organizationBilling: { select: { teamId: true } },
        },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(orgCursor ? { skip: 1, cursor: { id: orgCursor } } : {}),
      });

      if (page.length === 0) break;
      for (const r of page) {
        allRows.push({ teamId: r.organizationBilling.teamId, status: r.status });
      }
      orgCursor = page[page.length - 1].id;
      if (page.length < PAGE_SIZE) break;
    }

    const excludedSet = new Set(payload.excludedTeamIds);
    const filteredRows = excludedSet.size > 0 ? allRows.filter((r) => !excludedSet.has(r.teamId)) : allRows;

    if (filteredRows.length === 0 || payload.dryRun) {
      const statusCounts: Record<string, number> = {};
      for (const row of filteredRows) {
        statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
      }
      return { total: filteredRows.length, excluded: excludedSet.size, dryRun: payload.dryRun, statusCounts, sent: 0, failed: 0 };
    }

    let totalSucceeded = 0;
    let totalFailed = 0;

    for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
      const batch = filteredRows.slice(i, i + BATCH_SIZE);
      const results = await sendDunningEmailForStatus.batchTriggerAndWait(
        batch.map(({ teamId, status }) => ({
          payload: {
            teamId,
            status: status as "WARNING" | "SOFT_BLOCKED" | "HARD_BLOCKED" | "CANCELLED",
          },
        }))
      );

      totalSucceeded += results.runs.filter((run) => run.ok).length;
      totalFailed += results.runs.filter((run) => !run.ok).length;
    }

    return {
      total: filteredRows.length,
      excluded: excludedSet.size,
      sent: totalSucceeded,
      failed: totalFailed,
      dryRun: false,
    };
  },
});
