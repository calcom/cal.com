import type { ContactShareOption } from "../types";

export const CONTACTS_PAGE_SIZE = 10;

export const CONTACT_SHARE_OPTIONS: ContactShareOption[] = [
  { id: "copy", label: "Copy Link", description: "Copy your availability link" },
  { id: "email", label: "Email", description: "Open your mail client with a draft" },
  { id: "whatsapp", label: "WhatsApp", description: "Share in WhatsApp" },
];
