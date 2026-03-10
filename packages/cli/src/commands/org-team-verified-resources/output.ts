import { type OutputOptions, renderDetail, renderHeader, renderTable } from "../../shared/output";
import type {
  OrgTeamVerifiedEmail,
  OrgTeamVerifiedEmailsResponse,
  OrgTeamVerifiedPhone,
  OrgTeamVerifiedPhonesResponse,
} from "./types";

function renderOrgTeamVerifiedEmailDetail(email: OrgTeamVerifiedEmail): void {
  renderHeader(`Org Team Verified Email #${email.id}`);
  renderDetail([
    ["Email:", email.email],
    ["Team ID:", String(email.teamId)],
    ["User ID:", email.userId != null ? String(email.userId) : "N/A"],
  ]);
}

function renderOrgTeamVerifiedPhoneDetail(phone: OrgTeamVerifiedPhone): void {
  renderHeader(`Org Team Verified Phone #${phone.id}`);
  renderDetail([
    ["Phone:", phone.phoneNumber],
    ["Team ID:", String(phone.teamId)],
    ["User ID:", phone.userId != null ? String(phone.userId) : "N/A"],
  ]);
}

export function renderOrgTeamVerifiedEmail(
  data: OrgTeamVerifiedEmail | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Org team verified email not found.");
    return;
  }

  renderOrgTeamVerifiedEmailDetail(data);
}

export function renderOrgTeamVerifiedEmailList(
  emails: OrgTeamVerifiedEmailsResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(emails, null, 2));
    return;
  }

  if (!emails?.length) {
    console.log("No org team verified emails found.");
    return;
  }

  renderTable(
    ["ID", "Email", "Team ID", "User ID"],
    emails.map((e) => [String(e.id), e.email, String(e.teamId), e.userId != null ? String(e.userId) : "N/A"])
  );
}

export function renderOrgTeamVerifiedPhone(
  data: OrgTeamVerifiedPhone | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Org team verified phone not found.");
    return;
  }

  renderOrgTeamVerifiedPhoneDetail(data);
}

export function renderOrgTeamVerifiedPhoneList(
  phones: OrgTeamVerifiedPhonesResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(phones, null, 2));
    return;
  }

  if (!phones?.length) {
    console.log("No org team verified phones found.");
    return;
  }

  renderTable(
    ["ID", "Phone", "Team ID", "User ID"],
    phones.map((p) => [
      String(p.id),
      p.phoneNumber,
      String(p.teamId),
      p.userId != null ? String(p.userId) : "N/A",
    ])
  );
}
