import chalk from "chalk";
import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  BookingReferencesList,
  MyTeamsList,
  Team,
  TeamCreateResponse,
  TeamEventTypesList,
  TeamList,
  TeamMembershipCreateResponse,
  TeamMembershipList,
  TeamMembershipUpdateResponse,
  TeamUpdateResponse,
} from "./types";

function renderTeamDetail(team: Team): void {
  renderHeader(`Team: ${team.name}`);
  renderDetail([
    ["ID:", team.id],
    ["Slug:", team.slug],
    ["Bio:", team.bio],
    ["Hide Booking:", team.hideBookATeamMember],
    ["Timezone:", team.timeZone],
    ["Week Start:", team.weekStart],
  ]);
}

export function renderTeam(data: Team | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Team not found.");
    return;
  }

  renderTeamDetail(data);
}

export function renderTeamList(teams: TeamList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(teams, null, 2));
    return;
  }

  if (!teams?.length) {
    console.log("No teams found.");
    return;
  }

  renderTable(
    ["ID", "Name", "Slug", "Hide Booking"],
    teams.map((t) => [String(t.id), t.name, t.slug || "", t.hideBookATeamMember ? "Yes" : "No"])
  );
}

function getTeamFromResponse(data: TeamCreateResponse | TeamUpdateResponse | undefined): Team | undefined {
  if (!data) return undefined;
  if ("pendingTeam" in data) {
    return data.pendingTeam;
  }
  return data as Team;
}

export function renderTeamCreated(data: TeamCreateResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const team = getTeamFromResponse(data);
  if (!team) {
    console.log("Failed to create team.");
    return;
  }

  if (data && "paymentLink" in data) {
    renderSuccess(`Team created (pending payment): ${team.name} (ID: ${team.id})`);
    console.log(`  Payment Link: ${data.paymentLink}`);
    return;
  }

  renderSuccess(`Team created: ${team.name} (ID: ${team.id})`);
}

export function renderTeamUpdated(data: TeamUpdateResponse | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to update team.");
    return;
  }

  renderSuccess(`Team updated: ${data.name} (ID: ${data.id})`);
}

export function renderTeamDeleted(teamId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Team ${teamId} deleted` }));
    return;
  }

  renderSuccess(`Team ${teamId} deleted.`);
}

function formatMembershipRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function formatAccepted(accepted: boolean): string {
  return accepted ? chalk.green("Yes") : chalk.yellow("Pending");
}

export function renderMembershipList(
  memberships: TeamMembershipList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(memberships, null, 2));
    return;
  }

  if (!memberships?.length) {
    console.log("No team members found.");
    return;
  }

  renderTable(
    ["ID", "User ID", "Role", "Accepted", "Disabled"],
    memberships.map((m) => [
      String(m.id),
      String(m.userId),
      formatMembershipRole(m.role),
      formatAccepted(m.accepted),
      m.disableImpersonation ? "Yes" : "No",
    ])
  );
}

export function renderMembership(
  membership: TeamMembershipUpdateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(membership, null, 2));
    return;
  }

  if (!membership) {
    console.log("Membership not found.");
    return;
  }

  renderHeader(`Team Membership #${membership.id}`);
  renderDetail([
    ["User ID:", membership.userId],
    ["Team ID:", membership.teamId],
    ["Role:", formatMembershipRole(membership.role)],
    ["Accepted:", formatAccepted(membership.accepted)],
    ["Disabled:", membership.disableImpersonation],
  ]);
}

export function renderMembershipCreated(
  membership: TeamMembershipCreateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(membership, null, 2));
    return;
  }

  if (!membership) {
    console.log("Failed to add team member.");
    return;
  }

  renderSuccess(`Member added to team (ID: ${membership.id})`);
}

export function renderMembershipUpdated(
  membership: TeamMembershipUpdateResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(membership, null, 2));
    return;
  }

  if (!membership) {
    console.log("Failed to update membership.");
    return;
  }

  renderSuccess(`Membership updated (ID: ${membership.id})`);
}

export function renderMembershipDeleted(membershipId: string, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Membership ${membershipId} removed` }));
    return;
  }

  renderSuccess(`Membership ${membershipId} removed.`);
}

export function renderInviteCreated(
  data: { token: string; inviteLink: string } | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Failed to create invite.");
    return;
  }

  renderSuccess("Team invite created!");
  renderDetail([
    ["Token:", data.token],
    ["Invite Link:", data.inviteLink],
  ]);
}

export function renderMyTeamsList(teams: MyTeamsList | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(teams, null, 2));
    return;
  }

  if (!teams?.length) {
    console.log("No teams found for current user.");
    return;
  }

  renderTable(
    ["ID", "Name", "Slug", "Organization", "Private"],
    teams.map((t) => [
      String(t.id),
      t.name,
      t.slug || "",
      t.isOrganization ? "Yes" : "No",
      t.isPrivate ? "Yes" : "No",
    ])
  );
}

export function renderTeamEventTypesList(
  eventTypes: TeamEventTypesList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(eventTypes, null, 2));
    return;
  }

  if (!eventTypes?.length) {
    console.log("No team event types found.");
    return;
  }

  renderTable(
    ["ID", "Title", "Slug", "Duration", "Team ID"],
    eventTypes.map((et) => [
      String(et.id),
      et.title,
      et.slug,
      `${et.lengthInMinutes} min`,
      String(et.teamId ?? ""),
    ])
  );
}

export function renderBookingReferencesList(
  references: BookingReferencesList | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(references, null, 2));
    return;
  }

  if (!references?.length) {
    console.log("No booking references found.");
    return;
  }

  renderHeader("Booking References");
  renderTable(
    ["ID", "Type", "Event UID", "Destination Calendar ID"],
    references.map((ref) => [String(ref.id), ref.type, ref.eventUid, ref.destinationCalendarId ?? "N/A"])
  );
}
