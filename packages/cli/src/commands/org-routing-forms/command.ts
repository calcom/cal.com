import type { Command } from "commander";
import {
  organizationsRoutingFormsResponsesControllerCreateRoutingFormResponse as createRoutingFormResponse,
  organizationsRoutingFormsControllerGetOrganizationRoutingForms as getOrgRoutingForms,
  organizationsRoutingFormsResponsesControllerGetRoutingFormResponses as getRoutingFormResponses,
  organizationsRoutingFormsResponsesControllerUpdateRoutingFormResponse as updateRoutingFormResponse,
} from "../../generated/sdk.gen";
import type { UpdateRoutingFormResponseInput } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderCreateResponseResult,
  renderRoutingFormList,
  renderRoutingFormResponseList,
  renderUpdateResponseResult,
} from "./output";

function parseTeamIds(teamIdsStr: string | undefined): number[] | undefined {
  if (!teamIdsStr) {
    return undefined;
  }
  return teamIdsStr.split(",").map((id) => Number(id.trim()));
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  return Number(value);
}

function parseSortOrder(order: string | undefined): "asc" | "desc" | undefined {
  if (order === "asc" || order === "desc") {
    return order;
  }
  return undefined;
}

function parseSlotFormat(format: string | undefined): "range" | "time" | undefined {
  if (format === "range" || format === "time") {
    return format;
  }
  return undefined;
}

function registerRoutingFormsQueryCommands(routingFormsCmd: Command): void {
  routingFormsCmd
    .command("list")
    .description("List all organization routing forms")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of forms to return")
    .option("--skip <n>", "Number of forms to skip")
    .option("--team-ids <ids>", "Filter by team IDs (comma-separated)")
    .option("--json", "Output as JSON")
    .action(async (options: { orgId: string; take?: string; skip?: string; teamIds?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await getOrgRoutingForms({
          path: { orgId },
          query: {
            take: parseOptionalNumber(options.take),
            skip: parseOptionalNumber(options.skip),
            teamIds: parseTeamIds(options.teamIds),
          },
          headers: authHeader(),
        });

        renderRoutingFormList(response?.data, options);
      });
    });
}

function registerResponsesListCommand(responsesCmd: Command): void {
  responsesCmd
    .command("list <formId>")
    .description("List responses for a routing form")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of responses to return")
    .option("--skip <n>", "Number of responses to skip")
    .option("--sort-created <order>", "Sort by creation time (asc/desc)")
    .option("--routed-to-booking <uid>", "Filter by routed booking UID")
    .option("--json", "Output as JSON")
    .action(
      async (
        formId: string,
        options: {
          orgId: string;
          take?: string;
          skip?: string;
          sortCreated?: string;
          routedToBooking?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const { data: response } = await getRoutingFormResponses({
            path: { orgId, routingFormId: formId },
            query: {
              take: parseOptionalNumber(options.take),
              skip: parseOptionalNumber(options.skip),
              sortCreatedAt: parseSortOrder(options.sortCreated),
              routedToBookingUid: options.routedToBooking,
            },
            headers: authHeader(),
          });

          renderRoutingFormResponseList(response?.data, options);
        });
      }
    );
}

function registerResponsesCreateCommand(responsesCmd: Command): void {
  responsesCmd
    .command("create <formId>")
    .description("Create a routing form response and get available slots")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--start <date>", "Start date/time in ISO 8601 format (UTC)")
    .requiredOption("--end <date>", "End date/time in ISO 8601 format (UTC)")
    .option("--timezone <tz>", "Time zone for the response")
    .option("--duration <minutes>", "Duration in minutes")
    .option("--format <format>", "Slot format: range or time")
    .option("--queue-response", "Queue the form response")
    .option("--reschedule-booking <uid>", "Booking UID being rescheduled")
    .option("--json", "Output as JSON")
    .action(
      async (
        formId: string,
        options: {
          orgId: string;
          start: string;
          end: string;
          timezone?: string;
          duration?: string;
          format?: string;
          queueResponse?: boolean;
          rescheduleBooking?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const { data: response } = await createRoutingFormResponse({
            path: { orgId, routingFormId: formId },
            query: {
              start: options.start,
              end: options.end,
              timeZone: options.timezone,
              duration: parseOptionalNumber(options.duration),
              format: parseSlotFormat(options.format),
              queueResponse: options.queueResponse,
              bookingUidToReschedule: options.rescheduleBooking,
            },
            headers: authHeader(),
          });

          renderCreateResponseResult(response?.data, options);
        });
      }
    );
}

function registerResponsesUpdateCommand(responsesCmd: Command): void {
  responsesCmd
    .command("update <formId> <responseId>")
    .description("Update a routing form response")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--response <json>", "Response data as JSON")
    .option("--json", "Output as JSON")
    .action(async (formId: string, responseId: string, options: { orgId: string; response: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        let responseData: Record<string, unknown>;
        try {
          responseData = JSON.parse(options.response) as Record<string, unknown>;
        } catch {
          throw new Error("Invalid JSON provided for --response option");
        }

        const body: UpdateRoutingFormResponseInput = {
          response: responseData,
        };

        const { data: response } = await updateRoutingFormResponse({
          path: { orgId, routingFormId: formId, responseId: Number(responseId) },
          body,
          headers: authHeader(),
        });

        renderUpdateResponseResult(response?.data, options);
      });
    });
}

function registerResponsesCommands(routingFormsCmd: Command): void {
  const responsesCmd = routingFormsCmd.command("responses").description("Manage routing form responses");

  registerResponsesListCommand(responsesCmd);
  registerResponsesCreateCommand(responsesCmd);
  registerResponsesUpdateCommand(responsesCmd);
}

export function registerOrgRoutingFormsCommand(program: Command): void {
  const routingFormsCmd = program
    .command("org-routing-forms")
    .description("Manage organization routing forms");

  registerRoutingFormsQueryCommands(routingFormsCmd);
  registerResponsesCommands(routingFormsCmd);
}
