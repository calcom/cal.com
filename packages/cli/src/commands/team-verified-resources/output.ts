import { type OutputOptions, renderDetail, renderHeader, renderTable } from "../../shared/output";
import type {
  TeamVerifiedEmail,
  TeamVerifiedEmailsResponse,
  TeamVerifiedPhone,
  TeamVerifiedPhonesResponse,
} from "./types";

function renderTeamVerifiedEmailDetail(email: TeamVerifiedEmail): void {
  renderHeader(`Team Verified Email #${email.id}`);
  renderDetail([
    ["Email:", email.email],
    ["Team ID:", String(email.teamId)],
    ["User ID:", email.userId != null ? String(email.userId) : "N/A"],
  ]);
}

function renderTeamVerifiedPhoneDetail(phone: TeamVerifiedPhone): void {
  renderHeader(`Team Verified Phone #${phone.id}`);
  renderDetail([
    ["Phone:", phone.phoneNumber],
    ["Team ID:", String(phone.teamId)],
    ["User ID:", phone.userId != null ? String(phone.userId) : "N/A"],
  ]);
}

export function renderTeamVerifiedEmail(
  data: TeamVerifiedEmail | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Team verified email not found.");
    return;
  }

  renderTeamVerifiedEmailDetail(data);
}

export function renderTeamVerifiedEmailList(
  emails: TeamVerifiedEmailsResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(emails, null, 2));
    return;
  }

  if (!emails?.length) {
    console.log("No team verified emails found.");
    return;
  }

  renderTable(
    ["ID", "Email", "Team ID", "User ID"],
    emails.map((e) => [String(e.id), e.email, String(e.teamId), e.userId != null ? String(e.userId) : "N/A"])
  );
}

export function renderTeamVerifiedPhone(
  data: TeamVerifiedPhone | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Team verified phone not found.");
    return;
  }

  renderTeamVerifiedPhoneDetail(data);
}

export function renderTeamVerifiedPhoneList(
  phones: TeamVerifiedPhonesResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(phones, null, 2));
    return;
  }

  if (!phones?.length) {
    console.log("No team verified phones found.");
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
