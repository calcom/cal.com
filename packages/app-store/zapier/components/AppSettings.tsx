import TemplateCard from "./TemplateCard";

export type Template = {
  icon: string;
  app: string;
  text: string;
  link: string;
};

const templates: Template[] = [
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for scheduled events",
    link: "https://zapier.com/editor/170116665?attempt_id=6e954288-db41-43e8-8417-4a7b8f1a1166",
  },
  {
    icon: "googleSheets.svg",
    app: "Google Sheets",
    text: "Create Google Sheets rows for scheduled events",
    link: "https://workflows.zapier.com/?attempt_id=a086d136-b084-45bc-a6aa-c9f460b05b7d&template=1082047",
  },
  {
    icon: "salesforce.svg",
    app: "Salesforce",
    text: "Create Salesforce leads from new bookings",
    link: "https://zapier.com/editor/170116721?attempt_id=9f939229-ee89-4391-b9c7-f4645c60dbd4",
  },
  {
    icon: "todoist.svg",
    app: "Todoist",
    text: "Create Todoist tasks for scheduled events",
    link: "https://zapier.com/editor/170116746?attempt_id=d4501c34-c3f2-4e62-b5a2-034fbf39320d",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for rescheduled events",
    link: "https://zapier.com/editor/170116757?attempt_id=40e837b6-93e1-4bff-9cd7-5c8df1b0741e",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail for cancelled events",
    link: "https://zapier.com/editor/170116884?attempt_id=e52a2a0a-cea8-4d95-93ca-f010b3aceda1",
  },
  {
    icon: "gmail.svg",
    app: "Gmail",
    text: "Send emails via Gmail after scheduled meetings end",
    link: "https://zapier.com/editor/170116896?attempt_id=28a54a64-e1e4-4a93-b5e9-1258a083581d",
  },
  {
    icon: "googleCalendar.svg",
    app: "Google Calendar",
    text: "Add new bookings to Google Calendar",
    link: "https://zapier.com/editor/170116908?attempt_id=e2b7f20c-8825-42f8-a031-5134a02b7311",
  },
];

export default function AppSettings() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      {templates.map((template, index) => (
        <TemplateCard key={index} template={template} />
      ))}
    </div>
  );
}
