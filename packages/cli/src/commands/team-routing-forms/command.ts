import type { Command } from "commander";
import {
  organizationsTeamsRoutingFormsResponsesControllerCreateRoutingFormResponse as createRoutingFormResponse,
  organizationsTeamsRoutingFormsResponsesControllerGetRoutingFormResponses as getRoutingFormResponses,
  organizationsTeamsRoutingFormsControllerGetTeamRoutingForms as getTeamRoutingForms,
  organizationsTeamsRoutingFormsResponsesControllerUpdateRoutingFormResponse as updateRoutingFormResponse,
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

function registerRoutingFormsListCommand(routingFormsCmd: Command): void {
  routingFormsCmd
    .command("list <teamId>")
    .description("List all routing forms for a team")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of forms to return")
    .option("--skip <n>", "Number of forms to skip")
    .option("--sort-created <order>", "Sort by creation time (asc/desc)")
    .option("--routed-to-booking <uid>", "Filter by routed booking UID")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
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

          const { data: response } = await getTeamRoutingForms({
            path: { orgId: Number(options.orgId), teamId: Number(teamId) },
            query: {
              take: parseOptionalNumber(options.take),
              skip: parseOptionalNumber(options.skip),
              sortCreatedAt: parseSortOrder(options.sortCreated),
              routedToBookingUid: options.routedToBooking,
            },
            headers: authHeader(),
          });

          renderRoutingFormList(response?.data, options);
        });
      }
    );
}

function registerResponsesListCommand(responsesCmd: Command): void {
  responsesCmd
    .command("list <teamId> <formId>")
    .description("List responses for a team routing form")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of responses to return")
    .option("--skip <n>", "Number of responses to skip")
    .option("--sort-created <order>", "Sort by creation time (asc/desc)")
    .option("--routed-to-booking <uid>", "Filter by routed booking UID")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
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

          const { data: response } = await getRoutingFormResponses({
            path: { orgId: Number(options.orgId), teamId: Number(teamId), routingFormId: formId },
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
    .command("create <teamId> <formId>")
    .description("Create a team routing form response and get available slots")
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
        teamId: string,
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

          const { data: response } = await createRoutingFormResponse({
            path: { orgId: Number(options.orgId), teamId: Number(teamId), routingFormId: formId },
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
    .command("update <teamId> <formId> <responseId>")
    .description("Update a team routing form response")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--response <json>", "Response data as JSON")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        formId: string,
        responseId: string,
        options: { orgId: string; response: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

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
            path: {
              orgId: Number(options.orgId),
              teamId: Number(teamId),
              routingFormId: formId,
              responseId: Number(responseId),
            },
            body,
            headers: authHeader(),
          });

          renderUpdateResponseResult(response?.data, options);
        });
      }
    );
}

function registerResponsesCommands(routingFormsCmd: Command): void {
  const responsesCmd = routingFormsCmd.command("responses").description("Manage team routing form responses");

  registerResponsesListCommand(responsesCmd);
  registerResponsesCreateCommand(responsesCmd);
  registerResponsesUpdateCommand(responsesCmd);
}

export function registerTeamRoutingFormsCommand(program: Command): void {
  const routingFormsCmd = program.command("team-routing-forms").description("Manage team routing forms");

  registerRoutingFormsListCommand(routingFormsCmd);
  registerResponsesCommands(routingFormsCmd);
}
