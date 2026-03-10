import process from "node:process";
import type { Command } from "commander";
import {
  organizationsUsersOooControllerCreateOrganizationUserOoo as createOrgUserOoo,
  organizationsUsersOooControllerDeleteOrganizationUserOoo as deleteOrgUserOoo,
  organizationsUsersOooControllerGetOrganizationUserOoo as getOrgUserOooList,
  organizationsUsersOooControllerGetOrganizationUsersOoo as getOrgUsersOooList,
  organizationsUsersOooControllerUpdateOrganizationUserOoo as updateOrgUserOoo,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderError } from "../../shared/output";
import {
  renderOrgUserOooCreated,
  renderOrgUserOooDeleted,
  renderOrgUserOooList,
  renderOrgUserOooUpdated,
  renderOrgUsersOooList,
} from "./output";
import { VALID_REASONS } from "./types";

function registerOrgUserOooListCommand(oooCmd: Command): void {
  oooCmd
    .command("list <userId>")
    .description("List all out-of-office entries for a user in your organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--take <n>", "Number of entries to return")
    .option("--skip <n>", "Number of entries to skip")
    .option("--json", "Output as JSON")
    .action(
      async (
        userId: string,
        options: {
          orgId: string;
          sortStart?: string;
          sortEnd?: string;
          take?: string;
          skip?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

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

          const { data: response } = await getOrgUserOooList({
            path: { orgId, userId: Number(userId) },
            query,
            headers: authHeader(),
          });

          renderOrgUserOooList(response?.data, userId, options);
        });
      }
    );
}

function registerOrgUserOooCreateCommand(oooCmd: Command): void {
  oooCmd
    .command("create <userId>")
    .description("Create an out-of-office entry for a user in your organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
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
      async (
        userId: string,
        options: {
          orgId: string;
          start: string;
          end: string;
          reason: string;
          notes?: string;
          toUserId?: string;
          json?: boolean;
        }
      ) => {
        if (!VALID_REASONS.includes(options.reason as (typeof VALID_REASONS)[number])) {
          renderError(`Invalid reason "${options.reason}". Must be one of: ${VALID_REASONS.join(", ")}`);
          process.exit(1);
        }

        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

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

          const { data: response } = await createOrgUserOoo({
            path: { orgId, userId: Number(userId) },
            body,
            headers: authHeader(),
          });

          renderOrgUserOooCreated(response?.data, userId, options);
        });
      }
    );
}

function registerOrgUserOooUpdateCommand(oooCmd: Command): void {
  oooCmd
    .command("update <userId> <oooId>")
    .description("Update an out-of-office entry for a user in your organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--start <date>", "New start date (ISO 8601 UTC)")
    .option("--end <date>", "New end date (ISO 8601 UTC)")
    .option("--reason <reason>", "Reason (unspecified, vacation, travel, sick, public_holiday)")
    .option("--notes <notes>", "Optional notes")
    .option("--to-user-id <id>", "User ID to redirect bookings to")
    .option("--json", "Output as JSON")
    .action(
      async (
        userId: string,
        oooId: string,
        options: {
          orgId: string;
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
          const orgId = Number(options.orgId);

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

          const { data: response } = await updateOrgUserOoo({
            path: { orgId, userId: Number(userId), oooId: Number(oooId) },
            body,
            headers: authHeader(),
          });

          renderOrgUserOooUpdated(response?.data, userId, options);
        });
      }
    );
}

function registerOrgUserOooDeleteCommand(oooCmd: Command): void {
  oooCmd
    .command("delete <userId> <oooId>")
    .description("Delete an out-of-office entry for a user in your organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (userId: string, oooId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        await deleteOrgUserOoo({
          path: { orgId, userId: Number(userId), oooId: Number(oooId) },
          headers: authHeader(),
        });

        renderOrgUserOooDeleted(oooId, userId, options);
      });
    });
}

function registerOrgUsersOooListAllCommand(oooCmd: Command): void {
  oooCmd
    .command("list-all")
    .description("List all out-of-office entries for all users in your organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--email <email>", "Filter by user email")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--take <n>", "Number of entries to return")
    .option("--skip <n>", "Number of entries to skip")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        orgId: string;
        email?: string;
        sortStart?: string;
        sortEnd?: string;
        take?: string;
        skip?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const query: {
            email?: string;
            sortStart?: "asc" | "desc";
            sortEnd?: "asc" | "desc";
            take?: number;
            skip?: number;
          } = {};

          if (options.email) {
            query.email = options.email;
          }
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

          const { data: response } = await getOrgUsersOooList({
            path: { orgId },
            query,
            headers: authHeader(),
          });

          renderOrgUsersOooList(response?.data, options);
        });
      }
    );
}

export function registerOrgUserOooCommand(program: Command): void {
  const oooCmd = program
    .command("org-user-ooo")
    .description("Manage out-of-office entries for users in your organization");
  registerOrgUserOooListCommand(oooCmd);
  registerOrgUsersOooListAllCommand(oooCmd);
  registerOrgUserOooCreateCommand(oooCmd);
  registerOrgUserOooUpdateCommand(oooCmd);
  registerOrgUserOooDeleteCommand(oooCmd);
}
