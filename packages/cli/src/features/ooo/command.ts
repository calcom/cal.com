import process from "node:process";
import type { Command } from "commander";
import {
  organizationsUsersOooControllerCreateOrganizationUserOoo as createOoo,
  organizationsUsersOooControllerDeleteOrganizationUserOoo as deleteOoo,
  meControllerGetMe as getMe,
  organizationsUsersOooControllerGetOrganizationUserOoo as getOooList,
  organizationsUsersOooControllerUpdateOrganizationUserOoo as updateOoo,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderError } from "../../shared/output";
import { renderOooCreated, renderOooDeleted, renderOooList, renderOooUpdated } from "./output";
import { VALID_REASONS } from "./types";

interface OrgAndUser {
  orgId: number;
  userId: number;
}

async function getOrgAndUserId(): Promise<OrgAndUser> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

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

function registerOooListCommand(oooCmd: Command): void {
  oooCmd
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
        await withErrorHandling(async () => {
          await initializeClient();
          const { orgId, userId } = await getOrgAndUserId();

          const query: {
            sortStart?: "asc" | "desc";
            sortEnd?: "asc" | "desc";
            take?: number;
            skip?: number;
          } = {};

          if (options.sortStart === "asc" || options.sortStart === "desc") {
            query.sortStart = options.sortStart;
          }
          if (options.sortEnd === "asc" || options.sortEnd === "desc") {
            query.sortEnd = options.sortEnd;
          }
          if (options.take) {
            query.take = Number(options.take);
          }
          if (options.skip) {
            query.skip = Number(options.skip);
          }

          const { data: response } = await getOooList({
            path: { orgId, userId },
            query,
            headers: authHeader(),
          });

          renderOooList(response?.data, options);
        });
      }
    );
}

function registerOooCreateCommand(oooCmd: Command): void {
  oooCmd
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
        if (!VALID_REASONS.includes(options.reason as (typeof VALID_REASONS)[number])) {
          renderError(`Invalid reason "${options.reason}". Must be one of: ${VALID_REASONS.join(", ")}`);
          process.exit(1);
        }

        await withErrorHandling(async () => {
          await initializeClient();
          const { orgId, userId } = await getOrgAndUserId();

          const body: {
            start: string;
            end: string;
            reason?: "unspecified" | "vacation" | "travel" | "sick" | "public_holiday";
            notes?: string;
            toUserId?: number;
          } = {
            start: options.start,
            end: options.end,
            reason: options.reason as "unspecified" | "vacation" | "travel" | "sick" | "public_holiday",
          };

          if (options.notes) {
            body.notes = options.notes;
          }
          if (options.toUserId) {
            body.toUserId = Number(options.toUserId);
          }

          const { data: response } = await createOoo({
            path: { orgId, userId },
            body,
            headers: authHeader(),
          });

          renderOooCreated(response?.data, options);
        });
      }
    );
}

function registerOooUpdateCommand(oooCmd: Command): void {
  oooCmd
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
        if (options.reason && !VALID_REASONS.includes(options.reason as (typeof VALID_REASONS)[number])) {
          renderError(`Invalid reason "${options.reason}". Must be one of: ${VALID_REASONS.join(", ")}`);
          process.exit(1);
        }

        await withErrorHandling(async () => {
          await initializeClient();
          const { orgId, userId } = await getOrgAndUserId();

          const body: {
            start?: string;
            end?: string;
            reason?: "unspecified" | "vacation" | "travel" | "sick" | "public_holiday";
            notes?: string;
            toUserId?: number;
          } = {};

          if (options.start) {
            body.start = options.start;
          }
          if (options.end) {
            body.end = options.end;
          }
          if (options.reason) {
            body.reason = options.reason as "unspecified" | "vacation" | "travel" | "sick" | "public_holiday";
          }
          if (options.notes) {
            body.notes = options.notes;
          }
          if (options.toUserId) {
            body.toUserId = Number(options.toUserId);
          }

          const { data: response } = await updateOoo({
            path: { orgId, userId, oooId: Number(oooId) },
            body,
            headers: authHeader(),
          });

          renderOooUpdated(response?.data, options);
        });
      }
    );
}

function registerOooDeleteCommand(oooCmd: Command): void {
  oooCmd
    .command("delete <oooId>")
    .description("Delete an out-of-office entry")
    .option("--json", "Output as JSON")
    .action(async (oooId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { orgId, userId } = await getOrgAndUserId();

        await deleteOoo({
          path: { orgId, userId, oooId: Number(oooId) },
          headers: authHeader(),
        });

        renderOooDeleted(oooId, options);
      });
    });
}

export function registerOooCommand(program: Command): void {
  const oooCmd = program.command("ooo").description("Manage out-of-office entries");
  registerOooListCommand(oooCmd);
  registerOooCreateCommand(oooCmd);
  registerOooUpdateCommand(oooCmd);
  registerOooDeleteCommand(oooCmd);
}
