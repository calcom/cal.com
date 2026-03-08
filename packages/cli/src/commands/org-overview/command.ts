import type { Command } from "commander";
import {
  organizationsSchedulesControllerGetOrganizationSchedules as getOrgSchedules,
  organizationsUsersOooControllerGetOrganizationUsersOoo as getOrgUsersOoo,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderOrgOooList, renderOrgSchedulesList } from "./output";

function registerOrgOverviewOooCommand(overviewCmd: Command): void {
  overviewCmd
    .command("ooo")
    .description("List all out-of-office entries across the organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--email <email>", "Filter by user email address")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--take <n>", "Number of entries to return")
    .option("--skip <n>", "Number of entries to skip")
    .option("--json", "Output as JSON")
    .action(
      async (options: { orgId: string;
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

          const { data: response } = await getOrgUsersOoo({
            path: { orgId },
            query,
            headers: authHeader(),
          });

          renderOrgOooList(response?.data, options);
        });
      }
    );
}

function registerOrgOverviewSchedulesCommand(overviewCmd: Command): void {
  overviewCmd
    .command("schedules")
    .description("List all schedules across the organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of schedules to return")
    .option("--skip <n>", "Number of schedules to skip")
    .option("--json", "Output as JSON")
    .action(
      async (options: { orgId: string;
        take?: string;
        skip?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const query: {
            take?: number;
            skip?: number;
          } = {};

          if (options.take) {
            query.take = Number(options.take);
          }
          if (options.skip) {
            query.skip = Number(options.skip);
          }

          const { data: response } = await getOrgSchedules({
            path: { orgId },
            query,
            headers: authHeader(),
          });

          renderOrgSchedulesList(response?.data, options);
        });
      }
    );
}

export function registerOrgOverviewCommand(program: Command): void {
  const overviewCmd = program
    .command("org-overview")
    .description("View organization-wide OOO entries and schedules");

  registerOrgOverviewOooCommand(overviewCmd);
  registerOrgOverviewSchedulesCommand(overviewCmd);
}
