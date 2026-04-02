import { useLocale } from "@calcom/lib/hooks/useLocale";
import TemplateCard from "./TemplateCard";
import type { Template } from "./types";

const templates: Template[] = [
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for scheduled events",
    link: "https://zapier.com/app/editor/template/1071345",
  },
  {
    icon: "googleSheets.svg",
    app: "Google Sheets",
    text: "Create Google Sheets rows for scheduled events",
    link: "https://zapier.com/app/editor/template/1082047",
  },
  {
    icon: "salesforce.svg",
    app: "Salesforce",
    text: "Create Salesforce leads from new bookings",
    link: "https://zapier.com/app/editor/template/1082050",
  },
  {
    icon: "todoist.svg",
    app: "Todoist",
    text: "Create Todoist tasks for scheduled events",
    link: "https://zapier.com/app/editor/template/1082073",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for rescheduled events",
    link: "https://zapier.com/app/editor/template/1083605",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for cancelled events",
    link: "https://zapier.com/app/editor/template/1083609",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail after scheduled meetings end",
    link: "https://zapier.com/app/editor/template/1083613",
  },
  {
    icon: "googleCalendar.svg",
    app: "Google Calendar",
    text: "Add new bookings to Google Calendar",
    link: "https://zapier.com/app/editor/template/1083651",
  },
];

export default function AppSettings() {
  const { t } = useLocale();
  return (
    <>
      <div className="text-sm font-semibold leading-4 ">{t("get_started_zapier_templates")}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {templates.map((template, index) => (
          <TemplateCard key={index} template={template} />
        ))}
      </div>
    </>
  );
}
