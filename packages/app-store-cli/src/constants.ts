import os from "node:os";
import path from "node:path";

export const APP_STORE_PATH = path.join(__dirname, "..", "..", "app-store");
export const TEMPLATES_PATH = path.join(APP_STORE_PATH, "templates");
export const IS_WINDOWS_PLATFORM = os.platform() === "win32";

export const APP_CATEGORIES = [
  { label: "Analytics", value: "analytics" },
  { label: "AI & Automation", value: "automation" },
  { label: "Calendar", value: "calendar" },
  { label: "Conferencing", value: "conferencing" },
  { label: "CRM", value: "crm" },
  { label: "Messaging", value: "messaging" },
  { label: "Payment", value: "payment" },
  { label: "Other", value: "other" },
] as const;

export const VALID_CATEGORY_VALUES = APP_CATEGORIES.map((c) => c.value);
