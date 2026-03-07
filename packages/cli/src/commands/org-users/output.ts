import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type { OrgUser, OrgUserList, OrgUserResponse } from "./types";

function renderOrgUserDetail(user: OrgUser): void {
  renderHeader(`User: ${user.name || user.email}`);
  renderDetail([
    ["ID:", user.id],
    ["Email:", user.email],
    ["Username:", user.username],
    ["Name:", user.name],
    ["Bio:", user.bio],
    ["Timezone:", user.timeZone],
    ["Locale:", user.locale],
    ["Time Format:", user.timeFormat],
    ["Avatar URL:", user.avatarUrl],
  ]);
}

export function renderOrgUser(data: OrgUserResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("User not found.");
    return;
  }

  renderOrgUserDetail(data);
}

export function renderOrgUserList(users: OrgUserList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(users, null, 2));
    return;
  }

  if (!users?.length) {
    console.log("No organization users found.");
    return;
  }

  renderTable(
    ["ID", "Email", "Username", "Name", "Timezone"],
    users.map((u) => [String(u.id), u.email, u.username || "", u.name || "", u.timeZone || ""])
  );
}

export function renderOrgUserCreated(data: OrgUserResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create user.");
    return;
  }

  renderSuccess(`User created: ${data.email} (ID: ${data.id})`);
}

export function renderOrgUserUpdated(data: OrgUserResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update user.");
    return;
  }

  renderSuccess(`User updated: ${data.email} (ID: ${data.id})`);
}

export function renderOrgUserDeleted(userId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `User ${userId} deleted` }));
    return;
  }

  renderSuccess(`User ${userId} deleted.`);
}
