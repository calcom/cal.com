type WebhookIntegrationProps = {
    url: string;
};
export declare const hasTemplateIntegration: (props: WebhookIntegrationProps) => boolean;
declare const customTemplate: (props: WebhookIntegrationProps) => "" | "{\"content\": \"An event has been scheduled/updated\",\"embeds\": [{\"color\": 2697513,\"fields\": [{\"name\": \"Event Trigger\",\"value\": \"{{triggerEvent}}\"}, {\"name\": \"What\",\"value\": \"{{title}} ({{type}})\"},{\"name\": \"When\",\"value\": \"Start: {{startTime}} \\n End: {{endTime}} \\n Timezone: ({{organizer.timeZone}})\"},{\"name\": \"Who\",\"value\": \"Organizer: {{organizer.name}} ({{organizer.email}}) \\n Booker: {{attendees.0.name}} ({{attendees.0.email}})\" },{\"name\":\"Description\", \"value\":\": {{description}}\"},{\"name\":\"Where\",\"value\":\": {{location}} \"}]}]}";
export default customTemplate;
//# sourceMappingURL=integrationTemplate.d.ts.map