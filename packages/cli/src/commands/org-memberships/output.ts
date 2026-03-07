import chalk from "chalk";
import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  OrgMembership,
  OrgMembershipCreateResponse,
  OrgMembershipDeleteResponse,
  OrgMembershipGetResponse,
  OrgMembershipListResponse,
  OrgMembershipUpdateResponse,
} from "./types";

function formatMembershipRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function formatAccepted(accepted: boolean): string {
  return accepted ? chalk.green("Yes") : chalk.yellow("Pending");
}

export function renderOrgMembershipList(
  data: OrgMembershipListResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const memberships = Array.isArray(data) ? data : data ? [data] : [];

  if (!memberships.length) {
    console.log("No organization memberships found.");
    return;
  }

  renderTable(
    ["ID", "User ID", "Org ID", "Role", "Accepted", "Disabled"],
    memberships.map((m: OrgMembership) => [
      String(m.id),
      String(m.userId),
      String(m.teamId),
      formatMembershipRole(m.role),
      formatAccepted(m.accepted),
      m.disableImpersonation ? "Yes" : "No",
    ])
  );
}

export function renderOrgMembership(
  data: OrgMembershipGetResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Membership not found.");
    return;
  }

  renderHeader(`Organization Membership #${data.id}`);
  renderDetail([
    ["User ID:", data.userId],
    ["Org ID:", data.teamId],
    ["Role:", formatMembershipRole(data.role)],
    ["Accepted:", formatAccepted(data.accepted)],
    ["Impersonation Disabled:", data.disableImpersonation ?? false],
  ]);

  if (data.user) {
    renderHeader("User Details");
    renderDetail([
      ["Name:", data.user.name ?? "N/A"],
      ["Email:", data.user.email],
      ["Username:", data.user.username ?? "N/A"],
    ]);
  }
}

export function renderOrgMembershipCreated(
  data: OrgMembershipCreateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create organization membership.");
    return;
  }

  renderSuccess(`Organization membership created (ID: ${data.id})`);
}

export function renderOrgMembershipUpdated(
  data: OrgMembershipUpdateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update organization membership.");
    return;
  }

  renderSuccess(`Organization membership updated (ID: ${data.id})`);
}

export function renderOrgMembershipDeleted(
  data: OrgMembershipDeleteResponse | undefined,
  membershipId: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Membership ${membershipId} deleted`, data }));
    return;
  }

  renderSuccess(`Organization membership ${membershipId} deleted.`);
}
