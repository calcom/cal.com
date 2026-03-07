import chalk from "chalk";
import {
  formatDateTime,
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  CreateResponseResult,
  RoutingForm,
  RoutingFormResponse,
  RoutingFormsListResponse,
  UpdateResponseResult,
} from "./types";

function formatDisabledStatus(disabled: boolean): string {
  if (disabled) {
    return chalk.red("Disabled");
  }
  return chalk.green("Active");
}

function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

function renderRoutingFormDetail(form: RoutingForm): void {
  renderHeader(`Routing Form: ${form.name}`);
  renderDetail([
    ["ID:", form.id],
    ["Status:", formatDisabledStatus(form.disabled)],
    ["Position:", form.position],
    ["User ID:", form.userId],
    ["Team ID:", form.teamId],
    ["Description:", form.description ? truncateString(form.description, 50) : undefined],
    ["Created:", formatDateTime(form.createdAt)],
    ["Updated:", formatDateTime(form.updatedAt)],
  ]);
}

function renderResponseDetail(response: RoutingFormResponse): void {
  renderHeader(`Response #${response.id}`);
  renderDetail([
    ["Form ID:", response.formId],
    ["Form Filler ID:", response.formFillerId],
    ["Routed to Booking:", response.routedToBookingUid || "-"],
    ["Created:", formatDateTime(response.createdAt)],
    ["Response Data:", JSON.stringify(response.response)],
  ]);
}

function formatTeamId(teamId: number | null): string {
  if (teamId) {
    return String(teamId);
  }
  return "-";
}

export function renderRoutingFormList(
  forms: RoutingFormsListResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(forms, null, 2));
    return;
  }

  if (!forms?.length) {
    console.log("No routing forms found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Status", "Team ID", "Created"],
    forms.map((f) => [
      f.id,
      truncateString(f.name, 30),
      formatDisabledStatus(f.disabled),
      formatTeamId(f.teamId),
      formatDateTime(f.createdAt),
    ])
  );
}

export function renderRoutingForm(form: RoutingForm | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(form, null, 2));
    return;
  }

  if (!form) {
    console.log("Routing form not found.");
    return;
  }

  renderRoutingFormDetail(form);
}

export function renderRoutingFormResponse(
  response: RoutingFormResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (!response) {
    console.log("Routing form response not found.");
    return;
  }

  renderResponseDetail(response);
}

export function renderRoutingFormResponseList(
  response: RoutingFormResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (!response) {
    console.log("No routing form responses found.");
    return;
  }

  renderResponseDetail(response);
}

export function renderCreateResponseResult(
  data: CreateResponseResult | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create routing form response.");
    return;
  }

  renderSuccess("Routing form response created successfully.");
  renderDetail([
    ["Event Type ID:", data.eventTypeId],
    ["Custom Message:", data.routingCustomMessage],
    ["Redirect URL:", data.routingExternalRedirectUrl],
    ["Routing Info:", data.routing ? JSON.stringify(data.routing) : undefined],
  ]);
}

export function renderUpdateResponseResult(
  data: UpdateResponseResult | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update routing form response.");
    return;
  }

  renderSuccess(`Routing form response updated (ID: ${data.id})`);
}
