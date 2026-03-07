import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  RoutingFormWorkflow,
  RoutingFormWorkflowList,
  RoutingFormWorkflowResponse,
  TeamWorkflow,
  TeamWorkflowList,
  TeamWorkflowResponse,
} from "./types";

function formatTriggerType(trigger: { type: string } | undefined): string {
  if (!trigger) return "N/A";
  return trigger.type;
}

function formatEventTypeActivation(
  activation: { isActiveOnAllEventTypes?: boolean; activeOnEventTypeIds?: number[] } | undefined
): string {
  if (!activation) return "N/A";
  if (activation.isActiveOnAllEventTypes) return "All Event Types";
  if (activation.activeOnEventTypeIds?.length) {
    return `${activation.activeOnEventTypeIds.length} Event Types`;
  }
  return "Inactive";
}

function formatRoutingFormActivation(
  activation: { isActiveOnAllRoutingForms?: boolean; activeOnRoutingFormIds?: string[] } | undefined
): string {
  if (!activation) return "N/A";
  if (activation.isActiveOnAllRoutingForms) return "All Routing Forms";
  if (activation.activeOnRoutingFormIds?.length) {
    return `${activation.activeOnRoutingFormIds.length} Routing Forms`;
  }
  return "Inactive";
}

export function renderWorkflowList(workflows: TeamWorkflowList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(workflows, null, 2));
    return;
  }

  if (!workflows?.length) {
    console.log("No workflows found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Trigger", "Status"],
    workflows.map((w) => [
      String(w.id),
      w.name,
      formatTriggerType(w.trigger),
      formatEventTypeActivation(w.activation),
    ])
  );
}

function renderWorkflowDetail(workflow: TeamWorkflow): void {
  renderHeader(`Workflow: ${workflow.name}`);
  renderDetail([
    ["ID:", workflow.id],
    ["Name:", workflow.name],
    ["Type:", workflow.type],
    ["Team ID:", workflow.teamId],
    ["User ID:", workflow.userId],
    ["Trigger:", formatTriggerType(workflow.trigger)],
    ["Status:", formatEventTypeActivation(workflow.activation)],
  ]);
}

export function renderWorkflow(data: TeamWorkflowResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("Workflow not found.");
    return;
  }

  renderWorkflowDetail(data[0]);
}

export function renderWorkflowCreated(
  data: TeamWorkflowResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("Failed to create workflow.");
    return;
  }

  renderSuccess(`Workflow created: ${data[0].name} (ID: ${data[0].id})`);
}

export function renderWorkflowUpdated(
  data: TeamWorkflowResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("Failed to update workflow.");
    return;
  }

  renderSuccess(`Workflow updated: ${data[0].name} (ID: ${data[0].id})`);
}

export function renderWorkflowDeleted(workflowId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Workflow ${workflowId} deleted` }));
    return;
  }

  renderSuccess(`Workflow ${workflowId} deleted.`);
}

// Routing Form Workflow output functions

export function renderRoutingFormWorkflowList(
  workflows: RoutingFormWorkflowList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(workflows, null, 2));
    return;
  }

  if (!workflows?.length) {
    console.log("No routing form workflows found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Trigger", "Status"],
    workflows.map((w) => [
      String(w.id),
      w.name,
      formatTriggerType(w.trigger),
      formatRoutingFormActivation(w.activation),
    ])
  );
}

function renderRoutingFormWorkflowDetail(workflow: RoutingFormWorkflow): void {
  renderHeader(`Routing Form Workflow: ${workflow.name}`);
  renderDetail([
    ["ID:", workflow.id],
    ["Name:", workflow.name],
    ["Type:", workflow.type],
    ["Team ID:", workflow.teamId],
    ["User ID:", workflow.userId],
    ["Trigger:", formatTriggerType(workflow.trigger)],
    ["Status:", formatRoutingFormActivation(workflow.activation)],
  ]);
}

export function renderRoutingFormWorkflow(
  data: RoutingFormWorkflowResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("Routing form workflow not found.");
    return;
  }

  renderRoutingFormWorkflowDetail(data[0]);
}

export function renderRoutingFormWorkflowCreated(
  data: RoutingFormWorkflowResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("Failed to create routing form workflow.");
    return;
  }

  renderSuccess(`Routing form workflow created: ${data[0].name} (ID: ${data[0].id})`);
}

export function renderRoutingFormWorkflowUpdated(
  data: RoutingFormWorkflowResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.length) {
    console.log("Failed to update routing form workflow.");
    return;
  }

  renderSuccess(`Routing form workflow updated: ${data[0].name} (ID: ${data[0].id})`);
}

export function renderRoutingFormWorkflowDeleted(workflowId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Routing form workflow ${workflowId} deleted` }));
    return;
  }

  renderSuccess(`Routing form workflow ${workflowId} deleted.`);
}
