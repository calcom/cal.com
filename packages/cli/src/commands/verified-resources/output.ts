import {
  type OutputOptions,
  renderDetail,
  renderHeader,
  renderSuccess,
  renderTable,
} from "../../shared/output";
import type {
  VerifiedEmailData,
  VerifiedEmailListData,
  VerifiedPhoneData,
  VerifiedPhoneListData,
} from "./types";

export function renderVerifiedEmailList(
  data: VerifiedEmailListData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (!data?.length) {
    console.log("No verified email addresses found.");
    return;
  }
  renderTable(
    ["ID", "Email", "User ID"],
    data.map((email) => [String(email.id), email.email, String(email.userId)])
  );
}

export function renderVerifiedEmail(
  data: VerifiedEmailData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (!data) {
    console.log("Email not found.");
    return;
  }
  renderHeader("Verified Email");
  renderDetail([
    ["ID:", String(data.id)],
    ["Email:", data.email],
    ["User ID:", String(data.userId)],
  ]);
}

export function renderVerifiedPhoneList(
  data: VerifiedPhoneListData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (!data?.length) {
    console.log("No verified phone numbers found.");
    return;
  }
  renderTable(
    ["ID", "Phone Number", "User ID"],
    data.map((phone) => [String(phone.id), phone.phoneNumber, String(phone.userId)])
  );
}

export function renderVerifiedPhone(
  data: VerifiedPhoneData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (!data) {
    console.log("Phone not found.");
    return;
  }
  renderHeader("Verified Phone");
  renderDetail([
    ["ID:", String(data.id)],
    ["Phone:", data.phoneNumber],
    ["User ID:", String(data.userId)],
  ]);
}

export function renderVerificationCodeRequested(
  type: string,
  value: string,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify({ status: "success", message: `Verification code sent to ${value}` }));
    return;
  }
  renderSuccess(`Verification code sent to ${type}: ${value}`);
  console.log(`Please check your ${type} for the verification code.`);
}

export function renderVerified(
  type: string,
  value: string,
  data: VerifiedEmailData | VerifiedPhoneData | undefined,
  { json }: OutputOptions = {}
): void {
  if (json) {
    console.log(JSON.stringify(data || { status: "success", verified: true }));
    return;
  }
  renderSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} ${value} verified successfully.`);
}
