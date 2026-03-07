import type { Command } from "commander";
import {
  organizationTeamWorkflowsControllerCreateEventTypeWorkflow as createWorkflow,
  organizationTeamWorkflowsControllerCreateFormWorkflow as createRoutingFormWorkflow,
  organizationTeamWorkflowsControllerDeleteRoutingFormWorkflow as deleteRoutingFormWorkflow,
  organizationTeamWorkflowsControllerDeleteWorkflow as deleteWorkflow,
  meControllerGetMe as getMe,
  organizationTeamWorkflowsControllerGetRoutingFormWorkflowById as getRoutingFormWorkflowById,
  organizationTeamWorkflowsControllerGetRoutingFormWorkflows as getRoutingFormWorkflows,
  organizationTeamWorkflowsControllerGetWorkflowById as getWorkflowById,
  organizationTeamWorkflowsControllerGetWorkflows as getWorkflows,
  organizationTeamWorkflowsControllerUpdateRoutingFormWorkflow as updateRoutingFormWorkflow,
  organizationTeamWorkflowsControllerUpdateWorkflow as updateWorkflow,
} from "../../generated/sdk.gen";
import type {
  CreateEventTypeWorkflowDto,
  CreateFormWorkflowDto,
  UpdateEventTypeWorkflowDto,
  UpdateFormWorkflowDto,
} from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderRoutingFormWorkflow,
  renderRoutingFormWorkflowCreated,
  renderRoutingFormWorkflowDeleted,
  renderRoutingFormWorkflowList,
  renderRoutingFormWorkflowUpdated,
  renderWorkflow,
  renderWorkflowCreated,
  renderWorkflowDeleted,
  renderWorkflowList,
  renderWorkflowUpdated,
} from "./output";
import { VALID_EVENT_TYPE_TRIGGERS, VALID_ROUTING_FORM_TRIGGERS } from "./types";

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Team workflows require an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

function buildEventTypeTrigger(
  triggerType: string,
  offsetValue?: string,
  offsetUnit?: string
): CreateEventTypeWorkflowDto["trigger"] {
  const triggersRequiringOffset = ["beforeEvent", "afterEvent"];

  if (triggersRequiringOffset.includes(triggerType)) {
    const offset = {
      value: offsetValue ? Number(offsetValue) : 1,
      unit: (offsetUnit || "hour") as "minute" | "hour" | "day",
    };

    if (triggerType === "beforeEvent") {
      return { type: "beforeEvent" as const, offset };
    }
    return { type: "afterEvent" as const, offset };
  }

  switch (triggerType) {
    case "newEvent":
      return { type: "newEvent" as const };
    case "eventCancelled":
      return { type: "eventCancelled" as const };
    case "rescheduleEvent":
      return { type: "rescheduleEvent" as const };
    case "afterHostsCalVideoNoShow":
      return { type: "afterHostsCalVideoNoShow" as const };
    case "afterGuestsCalVideoNoShow":
      return { type: "afterGuestsCalVideoNoShow" as const };
    case "bookingRejected":
      return { type: "bookingRejected" as const };
    case "bookingRequested":
      return { type: "bookingRequested" as const };
    case "bookingPaymentInitiated":
      return { type: "bookingPaymentInitiated" as const };
    case "bookingPaid":
      return { type: "bookingPaid" as const };
    case "bookingNoShowUpdated":
      return { type: "bookingNoShowUpdated" as const };
    default:
      return { type: "newEvent" as const };
  }
}

function buildRoutingFormTrigger(
  triggerType: string,
  offsetValue?: string,
  offsetUnit?: string
): CreateFormWorkflowDto["trigger"] {
  if (triggerType === "formSubmittedNoEvent") {
    const offset = {
      value: offsetValue ? Number(offsetValue) : 1,
      unit: (offsetUnit || "hour") as "minute" | "hour" | "day",
    };
    return { type: "formSubmittedNoEvent" as const, offset };
  }
  return { type: "formSubmitted" as const };
}

function registerWorkflowQueryCommands(workflowsCmd: Command): void {
  workflowsCmd
    .command("list <teamId>")
    .description("List all team workflows")
    .option("--skip <n>", "Number of items to skip")
    .option("--take <n>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          skip?: string;
          take?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const { data: response } = await getWorkflows({
            path: { orgId, teamId: Number(teamId) },
            query: {
              skip: options.skip ? Number(options.skip) : undefined,
              take: options.take ? Number(options.take) : undefined,
            },
            headers: authHeader(),
          });

          renderWorkflowList(response?.data, options);
        });
      }
    );

  workflowsCmd
    .command("get <teamId> <workflowId>")
    .description("Get a team workflow by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, workflowId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getWorkflowById({
          path: { orgId, teamId: Number(teamId), workflowId: Number(workflowId) },
          headers: authHeader(),
        });

        renderWorkflow(response?.data, options);
      });
    });
}

function registerWorkflowMutationCommands(workflowsCmd: Command): void {
  workflowsCmd
    .command("create <teamId>")
    .description("Create a team workflow for event types")
    .requiredOption("--name <name>", "Workflow name")
    .requiredOption(
      "--trigger <trigger>",
      `Trigger type (${VALID_EVENT_TYPE_TRIGGERS.join(", ")})`
    )
    .option("--offset-value <value>", "Offset value for beforeEvent/afterEvent triggers")
    .option("--offset-unit <unit>", "Offset unit (minutes, hours, days)")
    .option("--active-on-all", "Activate workflow on all event types")
    .option("--event-type-ids <ids>", "Comma-separated event type IDs to activate on")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          name: string;
          trigger: string;
          offsetValue?: string;
          offsetUnit?: string;
          activeOnAll?: boolean;
          eventTypeIds?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const trigger = buildEventTypeTrigger(
            options.trigger,
            options.offsetValue,
            options.offsetUnit
          );

          const isActiveOnAll = options.activeOnAll ?? true;
          const eventTypeIds = options.eventTypeIds
            ? options.eventTypeIds.split(",").map((id) => Number(id.trim()))
            : undefined;

          const body: CreateEventTypeWorkflowDto = {
            name: options.name,
            trigger,
            activation: {
              isActiveOnAllEventTypes: isActiveOnAll,
              activeOnEventTypeIds: isActiveOnAll ? undefined : eventTypeIds,
            },
            steps: [],
          };

          const { data: response } = await createWorkflow({
            path: { orgId, teamId: Number(teamId) },
            body,
            headers: authHeader(),
          });

          renderWorkflowCreated(response?.data, options);
        });
      }
    );

  workflowsCmd
    .command("update <teamId> <workflowId>")
    .description("Update a team workflow")
    .option("--name <name>", "New workflow name")
    .option(
      "--trigger <trigger>",
      `Trigger type (${VALID_EVENT_TYPE_TRIGGERS.join(", ")})`
    )
    .option("--offset-value <value>", "Offset value for beforeEvent/afterEvent triggers")
    .option("--offset-unit <unit>", "Offset unit (minutes, hours, days)")
    .option("--active-on-all", "Activate workflow on all event types")
    .option("--event-type-ids <ids>", "Comma-separated event type IDs to activate on")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        workflowId: string,
        options: {
          name?: string;
          trigger?: string;
          offsetValue?: string;
          offsetUnit?: string;
          activeOnAll?: boolean;
          eventTypeIds?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const body: UpdateEventTypeWorkflowDto = {};

          if (options.name) {
            body.name = options.name;
          }

          if (options.trigger) {
            body.trigger = buildEventTypeTrigger(
              options.trigger,
              options.offsetValue,
              options.offsetUnit
            );
          }

          if (options.activeOnAll !== undefined || options.eventTypeIds) {
            const isActiveOnAll = options.activeOnAll ?? false;
            const eventTypeIds = options.eventTypeIds
              ? options.eventTypeIds.split(",").map((id) => Number(id.trim()))
              : undefined;

            body.activation = {
              isActiveOnAllEventTypes: isActiveOnAll,
              activeOnEventTypeIds: isActiveOnAll ? undefined : eventTypeIds,
            };
          }

          const { data: response } = await updateWorkflow({
            path: { orgId, teamId: Number(teamId), workflowId: Number(workflowId) },
            body,
            headers: authHeader(),
          });

          renderWorkflowUpdated(response?.data, options);
        });
      }
    );

  workflowsCmd
    .command("delete <teamId> <workflowId>")
    .description("Delete a team workflow")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, workflowId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        await deleteWorkflow({
          path: { orgId, teamId: Number(teamId), workflowId: Number(workflowId) },
          headers: authHeader(),
        });

        renderWorkflowDeleted(workflowId, options);
      });
    });
}

function registerRoutingFormWorkflowCommands(workflowsCmd: Command): void {
  const routingFormsCmd = workflowsCmd
    .command("routing-forms")
    .description("Manage routing form workflows");

  routingFormsCmd
    .command("list <teamId>")
    .description("List all routing form workflows")
    .option("--skip <n>", "Number of items to skip")
    .option("--take <n>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          skip?: string;
          take?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const { data: response } = await getRoutingFormWorkflows({
            path: { orgId, teamId: Number(teamId) },
            query: {
              skip: options.skip ? Number(options.skip) : undefined,
              take: options.take ? Number(options.take) : undefined,
            },
            headers: authHeader(),
          });

          renderRoutingFormWorkflowList(response?.data, options);
        });
      }
    );

  routingFormsCmd
    .command("get <teamId> <workflowId>")
    .description("Get a routing form workflow by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, workflowId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getRoutingFormWorkflowById({
          path: { orgId, teamId: Number(teamId), workflowId: Number(workflowId) },
          headers: authHeader(),
        });

        renderRoutingFormWorkflow(response?.data, options);
      });
    });

  routingFormsCmd
    .command("create <teamId>")
    .description("Create a routing form workflow")
    .requiredOption("--name <name>", "Workflow name")
    .option(
      "--trigger <trigger>",
      `Trigger type (${VALID_ROUTING_FORM_TRIGGERS.join(", ")})`,
      "formSubmitted"
    )
    .option("--offset-value <value>", "Offset value for formSubmittedNoEvent trigger")
    .option("--offset-unit <unit>", "Offset unit (minutes, hours, days)")
    .option("--active-on-all", "Activate workflow on all routing forms")
    .option("--routing-form-ids <ids>", "Comma-separated routing form IDs to activate on")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          name: string;
          trigger: string;
          offsetValue?: string;
          offsetUnit?: string;
          activeOnAll?: boolean;
          routingFormIds?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const trigger = buildRoutingFormTrigger(
            options.trigger,
            options.offsetValue,
            options.offsetUnit
          );

          const isActiveOnAll = options.activeOnAll ?? true;
          const routingFormIds = options.routingFormIds
            ? options.routingFormIds.split(",").map((id) => Number(id.trim()))
            : undefined;

          const body: CreateFormWorkflowDto = {
            name: options.name,
            trigger,
            activation: {
              isActiveOnAllRoutingForms: isActiveOnAll,
              activeOnRoutingFormIds: isActiveOnAll ? undefined : routingFormIds,
            },
            steps: [],
          };

          const { data: response } = await createRoutingFormWorkflow({
            path: { orgId, teamId: Number(teamId) },
            body,
            headers: authHeader(),
          });

          renderRoutingFormWorkflowCreated(response?.data, options);
        });
      }
    );

  routingFormsCmd
    .command("update <teamId> <workflowId>")
    .description("Update a routing form workflow")
    .option("--name <name>", "New workflow name")
    .option(
      "--trigger <trigger>",
      `Trigger type (${VALID_ROUTING_FORM_TRIGGERS.join(", ")})`
    )
    .option("--offset-value <value>", "Offset value for formSubmittedNoEvent trigger")
    .option("--offset-unit <unit>", "Offset unit (minutes, hours, days)")
    .option("--active-on-all", "Activate workflow on all routing forms")
    .option("--routing-form-ids <ids>", "Comma-separated routing form IDs to activate on")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        workflowId: string,
        options: {
          name?: string;
          trigger?: string;
          offsetValue?: string;
          offsetUnit?: string;
          activeOnAll?: boolean;
          routingFormIds?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const body: UpdateFormWorkflowDto = {};

          if (options.name) {
            body.name = options.name;
          }

          if (options.trigger) {
            body.trigger = buildRoutingFormTrigger(
              options.trigger,
              options.offsetValue,
              options.offsetUnit
            );
          }

          if (options.activeOnAll !== undefined || options.routingFormIds) {
            const isActiveOnAll = options.activeOnAll ?? false;
            const routingFormIds = options.routingFormIds
              ? options.routingFormIds.split(",").map((id) => Number(id.trim()))
              : undefined;

            body.activation = {
              isActiveOnAllRoutingForms: isActiveOnAll,
              activeOnRoutingFormIds: isActiveOnAll ? undefined : routingFormIds,
            };
          }

          const { data: response } = await updateRoutingFormWorkflow({
            path: { orgId, teamId: Number(teamId), workflowId: Number(workflowId) },
            body,
            headers: authHeader(),
          });

          renderRoutingFormWorkflowUpdated(response?.data, options);
        });
      }
    );

  routingFormsCmd
    .command("delete <teamId> <workflowId>")
    .description("Delete a routing form workflow")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, workflowId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        await deleteRoutingFormWorkflow({
          path: { orgId, teamId: Number(teamId), workflowId: Number(workflowId) },
          headers: authHeader(),
        });

        renderRoutingFormWorkflowDeleted(workflowId, options);
      });
    });
}

export function registerTeamWorkflowsCommand(program: Command): void {
  const workflowsCmd = program
    .command("team-workflows")
    .description("Manage team workflows for event types and routing forms");

  registerWorkflowQueryCommands(workflowsCmd);
  registerWorkflowMutationCommands(workflowsCmd);
  registerRoutingFormWorkflowCommands(workflowsCmd);
}
