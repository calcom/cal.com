const supportedWebhookIntegrationList = ["https://discord.com/api/webhooks/"];

type WebhookIntegrationProps = {
  url: string;
};

export const hasTemplateIntegration = (props: WebhookIntegrationProps) => {
  const ind = supportedWebhookIntegrationList.findIndex((integration) => {
    return props.url.includes(integration);
  });
  return ind > -1;
};

const customTemplate = (props: WebhookIntegrationProps) => {
  const ind = supportedWebhookIntegrationList.findIndex((integration) => {
    return props.url.includes(integration);
  });
  return integrationTemplate(supportedWebhookIntegrationList[ind]) || "";
};

const integrationTemplate = (webhookIntegration: string) => {
  switch (webhookIntegration) {
    case "https://discord.com/api/webhooks/":
      return '{"content": "An event has been scheduled/updated","embeds": [{"color": 2697513,"fields": [{"name": "Event Trigger","value": "{{triggerEvent}}"}, {"name": "What","value": "{{title}} ({{type}})"},{"name": "When","value": "Start: {{startTime}} \\n End: {{endTime}} \\n Timezone: ({{organizer.timeZone}})"},{"name": "Who","value": "Organizer: {{organizer.name}} ({{organizer.email}}) \\n Booker: {{attendees.0.name}} ({{attendees.0.email}})" },{"name":"Description", "value":": {{description}}"},{"name":"Where","value":": {{location}} "}]}]}';
  }
};

export default customTemplate;
