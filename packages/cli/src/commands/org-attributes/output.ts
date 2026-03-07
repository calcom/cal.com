import chalk from "chalk";
import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  OrgAssignOptionResponse,
  OrgAttribute,
  OrgAttributeCreateResponse,
  OrgAttributeDeleteResponse,
  OrgAttributeGetResponse,
  OrgAttributeList,
  OrgAttributeOptionCreateResponse,
  OrgAttributeOptionDeleteResponse,
  OrgAttributeOptionList,
  OrgAttributeOptionUpdateResponse,
  OrgAttributeUpdateResponse,
  OrgUnassignOptionResponse,
  OrgUserAttributeOptions,
} from "./types";

function formatAttributeType(type: string): string {
  switch (type) {
    case "TEXT":
      return chalk.blue(type);
    case "NUMBER":
      return chalk.cyan(type);
    case "SINGLE_SELECT":
      return chalk.green(type);
    case "MULTI_SELECT":
      return chalk.magenta(type);
    default:
      return type;
  }
}

function renderAttributeDetail(attribute: OrgAttribute): void {
  renderHeader(`Attribute: ${attribute.name}`);
  renderDetail([
    ["ID:", attribute.id],
    ["Name:", attribute.name],
    ["Slug:", attribute.slug],
    ["Type:", attribute.type],
    ["Team ID:", attribute.teamId],
    ["Enabled:", attribute.enabled],
  ]);
}

export function renderAttribute(
  data: OrgAttributeGetResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Attribute not found.");
    return;
  }

  renderAttributeDetail(data);
}

export function renderAttributeList(
  attributes: OrgAttributeList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(attributes, null, 2));
    return;
  }

  if (!attributes?.length) {
    console.log("No attributes found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Slug", "Type", "Enabled"],
    attributes.map((a) => [
      a.id,
      a.name,
      a.slug,
      formatAttributeType(a.type),
      a.enabled ? "Yes" : "No",
    ])
  );
}

export function renderAttributeCreated(
  data: OrgAttributeCreateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create attribute.");
    return;
  }

  renderSuccess(`Attribute created: ${data.name} (ID: ${data.id})`);
}

export function renderAttributeUpdated(
  data: OrgAttributeUpdateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update attribute.");
    return;
  }

  renderSuccess(`Attribute updated: ${data.name} (ID: ${data.id})`);
}

export function renderAttributeDeleted(
  data: OrgAttributeDeleteResponse | undefined,
  attributeId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(
      JSON.stringify({ status: "success", message: `Attribute ${attributeId} deleted`, data })
    );
    return;
  }

  renderSuccess(`Attribute ${attributeId} deleted.`);
}

export function renderOptionList(
  options: OrgAttributeOptionList | undefined,
  attributeId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(options, null, 2));
    return;
  }

  if (!options?.length) {
    console.log(`No options found for attribute ${attributeId}.`);
    return;
  }

  renderTable(
    ["ID", "Value", "Slug"],
    options.map((o) => [o.id, o.value, o.slug])
  );
}

export function renderOptionCreated(
  data: OrgAttributeOptionCreateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create option.");
    return;
  }

  renderSuccess(`Option created: ${data.value} (ID: ${data.id})`);
}

export function renderOptionUpdated(
  data: OrgAttributeOptionUpdateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update option.");
    return;
  }

  renderSuccess(`Option updated: ${data.value} (ID: ${data.id})`);
}

export function renderOptionDeleted(
  data: OrgAttributeOptionDeleteResponse | undefined,
  optionId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Option ${optionId} deleted`, data }));
    return;
  }

  renderSuccess(`Option ${optionId} deleted.`);
}

export function renderUserOptions(
  options: OrgUserAttributeOptions | undefined,
  userId: number,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(options, null, 2));
    return;
  }

  if (!options?.length) {
    console.log(`No attribute options assigned to user ${userId}.`);
    return;
  }

  renderHeader(`Attribute options for user ${userId}`);
  renderTable(
    ["ID", "Value", "Slug", "Attribute ID"],
    options.map((o) => [o.id, o.value, o.slug, o.attributeId])
  );
}

export function renderOptionAssigned(
  data: OrgAssignOptionResponse | undefined,
  userId: number,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to assign option.");
    return;
  }

  renderSuccess(`Option assigned to user ${userId} (Assignment ID: ${data.id})`);
}

export function renderOptionUnassigned(
  data: OrgUnassignOptionResponse | undefined,
  userId: number,
  optionId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(
      JSON.stringify({
        status: "success",
        message: `Option ${optionId} unassigned from user ${userId}`,
        data,
      })
    );
    return;
  }

  renderSuccess(`Option ${optionId} unassigned from user ${userId}.`);
}
