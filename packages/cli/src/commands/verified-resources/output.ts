import { type OutputOptions, renderDetail, renderHeader, renderTable } from "../../shared/output";
import type { VerifiedEmail, VerifiedEmailsResponse, VerifiedPhone, VerifiedPhonesResponse } from "./types";

function renderVerifiedEmailDetail(email: VerifiedEmail): void {
  renderHeader(`Verified Email #${email.id}`);
  renderDetail([
    ["Email:", email.email],
    ["User ID:", String(email.userId)],
  ]);
}

function renderVerifiedPhoneDetail(phone: VerifiedPhone): void {
  renderHeader(`Verified Phone #${phone.id}`);
  renderDetail([
    ["Phone:", phone.phoneNumber],
    ["User ID:", String(phone.userId)],
  ]);
}

export function renderVerifiedEmail(data: VerifiedEmail | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Verified email not found.");
    return;
  }

  renderVerifiedEmailDetail(data);
}

export function renderVerifiedEmailList(
  emails: VerifiedEmailsResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(emails, null, 2));
    return;
  }

  if (!emails?.length) {
    console.log("No verified emails found.");
    return;
  }

  renderTable(
    ["ID", "Email", "User ID"],
    emails.map((e) => [String(e.id), e.email, String(e.userId)])
  );
}

export function renderVerifiedPhone(data: VerifiedPhone | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data) {
    console.log("Verified phone not found.");
    return;
  }

  renderVerifiedPhoneDetail(data);
}

export function renderVerifiedPhoneList(
  phones: VerifiedPhonesResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(phones, null, 2));
    return;
  }

  if (!phones?.length) {
    console.log("No verified phones found.");
    return;
  }

  renderTable(
    ["ID", "Phone", "User ID"],
    phones.map((p) => [String(p.id), p.phoneNumber, String(p.userId)])
  );
}
