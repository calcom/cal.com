import process from "node:process";
import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface MeData {
  id: number;
  organizationId: number | null;
}

interface OooEntry {
  id: number;
  uuid: string;
  userId: number;
  toUserId?: number;
  start: string;
  end: string;
  notes?: string;
  reason?: string;
}

const VALID_REASONS: string[] = ["unspecified", "vacation", "travel", "sick", "public_holiday"];

async function getOrgAndUserId(): Promise<{ orgId: number; userId: number }> {
  const response = await apiRequest<MeData>("/v2/me");
  const me = response.data;
  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Out-of-office requires an organization. Your account does not belong to an organization."
    );
  }
  return { orgId: me.organizationId, userId: me.id };
}

function formatOooRow(entry: OooEntry): string[] {
  const start = new Date(entry.start);
  const end = new Date(entry.end);
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return [String(entry.id), startStr, endStr, entry.reason || "unspecified", entry.notes || ""];
}

function formatOooDetail(entry: OooEntry): void {
  console.log(chalk.bold("\nOut-of-Office Entry"));
  console.log(`  ID:       ${entry.id}`);
  console.log(`  Start:    ${new Date(entry.start).toLocaleDateString()}`);
  console.log(`  End:      ${new Date(entry.end).toLocaleDateString()}`);
  console.log(`  Reason:   ${entry.reason || "unspecified"}`);
  if (entry.notes) {
    console.log(`  Notes:    ${entry.notes}`);
  }
  if (entry.toUserId) {
    console.log(`  Cover:    User #${entry.toUserId}`);
  }
  console.log();
}

function registerOooListCommand(ooo: Command): void {
  ooo
    .command("list")
    .description("List your out-of-office entries")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--take <n>", "Number of entries to return")
    .option("--skip <n>", "Number of entries to skip")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        sortStart?: string;
        sortEnd?: string;
        take?: string;
        skip?: string;
        json?: boolean;
      }) => {
        const { orgId, userId } = await getOrgAndUserId();

        const query: Record<string, string | undefined> = {};
        if (options.sortStart) {
          query.sortStart = options.sortStart;
        }
        if (options.sortEnd) {
          query.sortEnd = options.sortEnd;
        }
        if (options.take) {
          query.take = options.take;
        }
        if (options.skip) {
          query.skip = options.skip;
        }

        const response = await apiRequest<OooEntry[]>(`/v2/organizations/${orgId}/users/${userId}/ooo`, {
          query,
        });

        handleOutput(response.data, options, (data) => {
          if (!data || data.length === 0) {
            console.log("No out-of-office entries found.");
            return;
          }
          outputTable(["ID", "Start", "End", "Reason", "Notes"], data.map(formatOooRow));
        });
      }
    );
}

function registerOooCreateCommand(ooo: Command): void {
  ooo
    .command("create")
    .description("Create an out-of-office entry")
    .requiredOption("--start <date>", "Start date (ISO 8601 UTC, e.g. 2025-06-01T00:00:00.000Z)")
    .requiredOption("--end <date>", "End date (ISO 8601 UTC, e.g. 2025-06-10T23:59:59.999Z)")
    .option(
      "--reason <reason>",
      "Reason (unspecified, vacation, travel, sick, public_holiday)",
      "unspecified"
    )
    .option("--notes <notes>", "Optional notes")
    .option("--to-user-id <id>", "User ID to redirect bookings to")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        start: string;
        end: string;
        reason: string;
        notes?: string;
        toUserId?: string;
        json?: boolean;
      }) => {
        if (!VALID_REASONS.includes(options.reason)) {
          outputError(`Invalid reason "${options.reason}". Must be one of: ${VALID_REASONS.join(", ")}`);
          process.exit(1);
        }

        const { orgId, userId } = await getOrgAndUserId();

        const body: Record<string, unknown> = {
          start: options.start,
          end: options.end,
          reason: options.reason,
        };
        if (options.notes) {
          body.notes = options.notes;
        }
        if (options.toUserId) {
          body.toUserId = Number(options.toUserId);
        }

        const response = await apiRequest<OooEntry>(`/v2/organizations/${orgId}/users/${userId}/ooo`, {
          method: "POST",
          body,
        });

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to create out-of-office entry.");
            return;
          }
          outputSuccess(`Out-of-office entry created (ID: ${data.id}).`);
          formatOooDetail(data);
        });
      }
    );
}

function registerOooDeleteCommand(ooo: Command): void {
  ooo
    .command("delete <oooId>")
    .description("Delete an out-of-office entry")
    .option("--json", "Output as JSON")
    .action(async (oooId: string, options: { json?: boolean }) => {
      const { orgId, userId } = await getOrgAndUserId();

      const response = await apiRequest<OooEntry>(`/v2/organizations/${orgId}/users/${userId}/ooo/${oooId}`, {
        method: "DELETE",
      });

      handleOutput(response.data, options, () => {
        outputSuccess(`Out-of-office entry ${oooId} deleted.`);
      });
    });
}

function registerOooUpdateCommand(ooo: Command): void {
  ooo
    .command("update <oooId>")
    .description("Update an out-of-office entry")
    .option("--start <date>", "New start date (ISO 8601 UTC)")
    .option("--end <date>", "New end date (ISO 8601 UTC)")
    .option("--reason <reason>", "Reason (unspecified, vacation, travel, sick, public_holiday)")
    .option("--notes <notes>", "Optional notes")
    .option("--to-user-id <id>", "User ID to redirect bookings to")
    .option("--json", "Output as JSON")
    .action(
      async (
        oooId: string,
        options: {
          start?: string;
          end?: string;
          reason?: string;
          notes?: string;
          toUserId?: string;
          json?: boolean;
        }
      ) => {
        if (options.reason && !VALID_REASONS.includes(options.reason)) {
          outputError(`Invalid reason "${options.reason}". Must be one of: ${VALID_REASONS.join(", ")}`);
          process.exit(1);
        }

        const { orgId, userId } = await getOrgAndUserId();

        const body: Record<string, unknown> = {};
        if (options.start) {
          body.start = options.start;
        }
        if (options.end) {
          body.end = options.end;
        }
        if (options.reason) {
          body.reason = options.reason;
        }
        if (options.notes) {
          body.notes = options.notes;
        }
        if (options.toUserId) {
          body.toUserId = Number(options.toUserId);
        }

        const response = await apiRequest<OooEntry>(
          `/v2/organizations/${orgId}/users/${userId}/ooo/${oooId}`,
          { method: "PATCH", body }
        );

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to update out-of-office entry.");
            return;
          }
          outputSuccess(`Out-of-office entry ${oooId} updated.`);
          formatOooDetail(data);
        });
      }
    );
}

function registerOooCommand(program: Command): void {
  const ooo = program.command("ooo").description("Manage out-of-office entries");
  registerOooListCommand(ooo);
  registerOooCreateCommand(ooo);
  registerOooUpdateCommand(ooo);
  registerOooDeleteCommand(ooo);
}

export { registerOooCommand };
