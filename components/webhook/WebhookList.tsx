import { EventType } from "@prisma/client";

import { Webhook } from "@lib/webhook";

import WebhookListItem from "./WebhookListItem";

export default function WebhookList(props: {
  webhooks: Webhook[];
  eventTypes: EventType[];
  onChange: () => void;
}) {
  return (
    <div>
      <ul className="px-4 mb-2 bg-white border divide-y divide-gray-200 rounded">
        {props.webhooks.map((webhook: Webhook) => (
          <WebhookListItem
            onChange={props.onChange}
            eventTypes={props.eventTypes}
            key={webhook.id}
            webhook={webhook}></WebhookListItem>
        ))}
      </ul>
    </div>
  );
}
