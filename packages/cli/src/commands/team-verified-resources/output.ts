import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  RequestEmailCodeResponse,
  RequestPhoneCodeResponse,
  VerifiedEmailData,
  VerifiedEmailResponse,
  VerifiedEmailsResponse,
  VerifiedPhoneData,
  VerifiedPhoneResponse,
  VerifiedPhonesResponse,
} from "./types";

function renderVerifiedEmailDetail(data: VerifiedEmailData): void {
  renderHeader(`Verified Email: ${data.email}`);
  renderDetail([
    ["ID:", String(data.id)],
    ["Email:", data.email],
    ["Team ID:", String(data.teamId)],
    ["User ID:", data.userId != null ? String(data.userId) : "N/A"],
  ]);
}

function renderVerifiedPhoneDetail(data: VerifiedPhoneData): void {
  renderHeader(`Verified Phone: ${data.phoneNumber}`);
  renderDetail([
    ["ID:", String(data.id)],
    ["Phone:", data.phoneNumber],
    ["Team ID:", String(data.teamId)],
    ["User ID:", data.userId != null ? String(data.userId) : "N/A"],
  ]);
}

export function renderVerifiedEmail(
  response: VerifiedEmailResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (!response?.data) {
    console.log("Verified email not found.");
    return;
  }

  renderVerifiedEmailDetail(response.data);
}

export function renderVerifiedEmailsList(
  response: VerifiedEmailsResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  const data = response?.data;
  if (!data?.length) {
    console.log("No verified emails found.");
    return;
  }

  renderHeader("Verified Emails");
  renderTable(
    ["ID", "Email", "Team ID", "User ID"],
    data.map((email) => [
      String(email.id),
      email.email,
      String(email.teamId),
      email.userId != null ? String(email.userId) : "N/A",
    ])
  );
}

export function renderVerifiedPhone(
  response: VerifiedPhoneResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (!response?.data) {
    console.log("Verified phone not found.");
    return;
  }

  renderVerifiedPhoneDetail(response.data);
}

export function renderVerifiedPhonesList(
  response: VerifiedPhonesResponse | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  const data = response?.data;
  if (!data?.length) {
    console.log("No verified phones found.");
    return;
  }

  renderHeader("Verified Phone Numbers");
  renderTable(
    ["ID", "Phone", "Team ID", "User ID"],
    data.map((phone) => [
      String(phone.id),
      phone.phoneNumber,
      String(phone.teamId),
      phone.userId != null ? String(phone.userId) : "N/A",
    ])
  );
}

export function renderEmailCodeRequested(
  response: RequestEmailCodeResponse | undefined,
  email: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify({ status: response?.status, email }, null, 2));
    return;
  }

  if (response?.status === "success") {
    renderSuccess(`Verification code sent to ${email}`);
  } else {
    console.log(`Failed to send verification code to ${email}`);
  }
}

export function renderPhoneCodeRequested(
  response: RequestPhoneCodeResponse | undefined,
  phone: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify({ status: response?.status, phone }, null, 2));
    return;
  }

  if (response?.status === "success") {
    renderSuccess(`Verification code sent to ${phone}`);
  } else {
    console.log(`Failed to send verification code to ${phone}`);
  }
}

export function renderEmailVerified(
  response: VerifiedEmailResponse | undefined,
  email: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (response?.status === "success") {
    renderSuccess(`Email ${email} verified successfully`);
    if (response.data) {
      renderVerifiedEmailDetail(response.data);
    }
  } else {
    console.log(`Failed to verify email ${email}`);
  }
}

export function renderPhoneVerified(
  response: VerifiedPhoneResponse | undefined,
  phone: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (response?.status === "success") {
    renderSuccess(`Phone ${phone} verified successfully`);
    if (response.data) {
      renderVerifiedPhoneDetail(response.data);
    }
  } else {
    console.log(`Failed to verify phone ${phone}`);
  }
}
