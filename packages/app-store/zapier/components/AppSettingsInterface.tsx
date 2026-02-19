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
    icon: "zapier.svg",
    app: "Zapier",
    text: "Handle booking no-show updates",
    link: "https://zapier.com/app/editor/template/1083614",
  },
];

const AppSettingsInterface = () => {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {templates.map((template) => (
        <TemplateCard key={template.link} template={template} />
      ))}
    </div>
  );
};

export default AppSettingsInterface;
