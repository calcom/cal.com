import TemplateCard from "./TemplateCard";

export type Template = {
  icon: string;
  app: string;
  text: string;
};

const templates: Template[] = [
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gemail for scheduled Cal.com events",
  },
  {
    icon: "googleSheets.svg",
    app: "Google Sheets",
    text: "Create Google Sheets rows for scheduled Cal.com events",
  },
  {
    icon: "salesforce.svg",
    app: "Salesforce",
    text: "Create Salesforce leads from new bookings in Cal.com ",
  },
  {
    icon: "todoist.svg",
    app: "Todoist",
    text: "Create Todoist tasks for scheduled Cal.com events",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for rescheduled Cal.com events",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for cancelled Cal.com events",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail after scheduled Cal.com meetings end",
  },
  {
    icon: "googleCalendar.svg",
    app: "Google Calendar",
    text: "Add new Cal.com bookings to Google Calendar",
  },
];

export default function AppSettings() {
  return (
    <div className="grid grid-cols-2 gap-4 border-t border-gray-200 p-4">
      {templates.map((template, index) => (
        <TemplateCard key={index} template={template} />
      ))}
    </div>
  );
}
