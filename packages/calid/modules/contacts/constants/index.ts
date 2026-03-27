import type { ContactShareOption } from "../types";

export const CONTACTS_PAGE_SIZE = 10;

export const CONTACT_SHARE_OPTIONS: ContactShareOption[] = [
  {
    id: "copy",
    labelKey: "contacts_share_option_copy_link",
    descriptionKey: "contacts_share_option_copy_availability_link",
  },
  {
    id: "email",
    labelKey: "contacts_share_option_email",
    descriptionKey: "contacts_share_option_open_mail_draft",
  },
  {
    id: "whatsapp",
    labelKey: "contacts_share_option_whatsapp",
    descriptionKey: "contacts_share_option_share_whatsapp",
  },
];
