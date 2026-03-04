import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputError, outputSuccess, outputTable } from "../lib/output";

interface PrivateLink {
  linkId: string;
  eventTypeId: number;
  isExpired: boolean;
  bookingUrl: string;
  expiresAt?: string;
  maxUsageCount?: number;
  usageCount?: number;
}

function formatExpiredStatus(isExpired: boolean): string {
  if (isExpired) {
    return chalk.red("Yes");
  }
  return chalk.green("No");
}

function formatLinkType(link: PrivateLink): string {
  if (link.expiresAt !== undefined) {
    return "Time-based";
  }
  return "Usage-based";
}

function formatLinkDetails(link: PrivateLink): string {
  if (link.expiresAt !== undefined) {
    return `Expires: ${link.expiresAt}`;
  }
  if (link.maxUsageCount !== undefined && link.usageCount !== undefined) {
    return `Usage: ${link.usageCount}/${link.maxUsageCount}`;
  }
  return "N/A";
}

function registerPrivateLinksQueryCommands(privateLinks: Command): void {
  privateLinks
    .command("list")
    .description("List all private links for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(async (options: { eventTypeId: string; json?: boolean }) => {
      const response = await apiRequest<PrivateLink[]>(
        `/v2/event-types/${options.eventTypeId}/private-links`
      );

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log("No private links found.");
          return;
        }
        outputTable(
          ["Link ID", "Type", "Expired", "Details", "Booking URL"],
          data.map((link) => [
            link.linkId,
            formatLinkType(link),
            formatExpiredStatus(link.isExpired),
            formatLinkDetails(link),
            link.bookingUrl,
          ])
        );
      });
    });

  privateLinks
    .command("get <linkId>")
    .description("Get a private link by ID")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(async (linkId: string, options: { eventTypeId: string; json?: boolean }) => {
      const response = await apiRequest<PrivateLink[]>(
        `/v2/event-types/${options.eventTypeId}/private-links`
      );

      const link = response.data?.find((l) => l.linkId === linkId);

      handleOutput(link, options, (data) => {
        if (!data) {
          outputError(`Private link "${linkId}" not found.`);
          return;
        }
        console.log(chalk.bold(`\nPrivate Link: ${data.linkId}`));
        console.log(`  Event Type ID: ${data.eventTypeId}`);
        console.log(`  Type:          ${formatLinkType(data)}`);
        console.log(`  Expired:       ${formatExpiredStatus(data.isExpired)}`);
        console.log(`  Booking URL:   ${data.bookingUrl}`);
        if (data.expiresAt !== undefined) {
          console.log(`  Expires At:    ${data.expiresAt}`);
        }
        if (data.maxUsageCount !== undefined) {
          console.log(`  Max Usage:     ${data.maxUsageCount}`);
        }
        if (data.usageCount !== undefined) {
          console.log(`  Current Usage: ${data.usageCount}`);
        }
        console.log();
      });
    });
}

function registerPrivateLinksMutationCommands(privateLinks: Command): void {
  privateLinks
    .command("create")
    .description("Create a private link for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--expires-at <date>", "Expiration date (ISO 8601 format, e.g. 2024-12-31T23:59:59.000Z)")
    .option("--max-usage-count <count>", "Maximum number of times the link can be used (default: 1)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        eventTypeId: string;
        expiresAt?: string;
        maxUsageCount?: string;
        json?: boolean;
      }) => {
        const body: Record<string, unknown> = {};
        if (options.expiresAt) {
          body.expiresAt = options.expiresAt;
        }
        if (options.maxUsageCount) {
          body.maxUsageCount = Number(options.maxUsageCount);
        }

        const response = await apiRequest<PrivateLink>(
          `/v2/event-types/${options.eventTypeId}/private-links`,
          {
            method: "POST",
            body,
          }
        );

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to create private link.");
            return;
          }
          outputSuccess(`Private link created: ${data.linkId}`);
          console.log(`  Booking URL: ${data.bookingUrl}`);
        });
      }
    );

  privateLinks
    .command("update <linkId>")
    .description("Update a private link for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--expires-at <date>", "New expiration date (ISO 8601 format)")
    .option("--max-usage-count <count>", "New maximum usage count")
    .option("--json", "Output as JSON")
    .action(
      async (
        linkId: string,
        options: {
          eventTypeId: string;
          expiresAt?: string;
          maxUsageCount?: string;
          json?: boolean;
        }
      ) => {
        const body: Record<string, unknown> = {};
        if (options.expiresAt) {
          body.expiresAt = options.expiresAt;
        }
        if (options.maxUsageCount) {
          body.maxUsageCount = Number(options.maxUsageCount);
        }

        const response = await apiRequest<PrivateLink>(
          `/v2/event-types/${options.eventTypeId}/private-links/${linkId}`,
          {
            method: "PATCH",
            body,
          }
        );

        handleOutput(response.data, options, (data) => {
          if (!data) {
            outputError("Failed to update private link.");
            return;
          }
          outputSuccess(`Private link updated: ${data.linkId}`);
        });
      }
    );

  privateLinks
    .command("delete <linkId>")
    .description("Delete a private link for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(async (linkId: string, options: { eventTypeId: string; json?: boolean }) => {
      const response = await apiRequest<{ linkId: string; message: string }>(
        `/v2/event-types/${options.eventTypeId}/private-links/${linkId}`,
        { method: "DELETE" }
      );

      handleOutput(response.data, options, (data) => {
        if (!data) {
          outputError("Failed to delete private link.");
          return;
        }
        outputSuccess(`Private link "${linkId}" deleted.`);
      });
    });
}

export function registerPrivateLinksCommand(program: Command): void {
  const privateLinks = program.command("private-links").description("Manage private links for event types");
  registerPrivateLinksQueryCommands(privateLinks);
  registerPrivateLinksMutationCommands(privateLinks);
}
