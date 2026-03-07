import chalk from "chalk";
import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  OrgRole,
  OrgRoleCreateResponse,
  OrgRoleDeleteResponse,
  OrgRoleGetResponse,
  OrgRoleList,
  OrgRolePermissionsList,
  OrgRoleUpdateResponse,
} from "./types";

function formatRoleType(type: string): string {
  if (type === "SYSTEM") {
    return chalk.blue(type);
  }
  return chalk.green(type);
}

function renderRoleDetail(role: OrgRole): void {
  renderHeader(`Role: ${role.name}`);
  renderDetail([
    ["ID:", role.id],
    ["Name:", role.name],
    ["Type:", role.type],
    ["Color:", role.color],
    ["Description:", role.description],
    ["Organization ID:", role.organizationId],
    ["Created At:", role.createdAt],
    ["Updated At:", role.updatedAt],
  ]);

  if (role.permissions && role.permissions.length > 0) {
    console.log("  Permissions:");
    for (const perm of role.permissions) {
      console.log(`    - ${perm}`);
    }
    console.log();
  }
}

export function renderRole(data: OrgRoleGetResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Role not found.");
    return;
  }

  renderRoleDetail(data);
}

export function renderRoleList(roles: OrgRoleList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(roles, null, 2));
    return;
  }

  if (!roles?.length) {
    console.log("No roles found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Type", "Description"],
    roles.map((r) => [r.id, r.name, formatRoleType(r.type), r.description || ""])
  );
}

export function renderRoleCreated(
  data: OrgRoleCreateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create role.");
    return;
  }

  renderSuccess(`Role created: ${data.name} (ID: ${data.id})`);
}

export function renderRoleUpdated(
  data: OrgRoleUpdateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update role.");
    return;
  }

  renderSuccess(`Role updated: ${data.name} (ID: ${data.id})`);
}

export function renderRoleDeleted(
  data: OrgRoleDeleteResponse | undefined,
  roleId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Role ${roleId} deleted`, data }));
    return;
  }

  renderSuccess(`Role ${roleId} deleted.`);
}

export function renderPermissionsList(
  permissions: OrgRolePermissionsList | undefined,
  roleId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(permissions, null, 2));
    return;
  }

  if (!permissions?.length) {
    console.log(`No permissions found for role ${roleId}.`);
    return;
  }

  renderHeader(`Permissions for role ${roleId}`);
  for (const perm of permissions) {
    console.log(`  - ${perm}`);
  }
  console.log();
}

export function renderPermissionsAdded(
  permissions: OrgRolePermissionsList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(permissions, null, 2));
    return;
  }

  renderSuccess("Permissions added successfully.");
  if (permissions?.length) {
    renderHeader("Current permissions");
    for (const perm of permissions) {
      console.log(`  - ${perm}`);
    }
    console.log();
  }
}

export function renderPermissionsSet(
  permissions: OrgRolePermissionsList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(permissions, null, 2));
    return;
  }

  renderSuccess("Permissions replaced successfully.");
  if (permissions?.length) {
    renderHeader("Current permissions");
    for (const perm of permissions) {
      console.log(`  - ${perm}`);
    }
    console.log();
  }
}

export function renderPermissionsRemoved(roleId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Permissions removed from role ${roleId}` }));
    return;
  }

  renderSuccess(`Permissions removed from role ${roleId}.`);
}
