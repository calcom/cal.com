import { Webhook } from "@lib/webhook";

import WebhookListItem from "./WebhookListItem";

export default function WebhookList(props: {
  webhooks: Webhook[];
  onChange: () => void;
  onEditWebhook: (webhook: Webhook) => void;
}) {
  return (
    <div>
      <ul className="px-4 mb-2 bg-white border divide-y divide-gray-200 rounded">
        {props.webhooks.map((webhook: Webhook) => (
          <WebhookListItem
            onChange={props.onChange}
            key={webhook.id}
            webhook={webhook}
            onEditWebhook={() => props.onEditWebhook(webhook)}></WebhookListItem>
        ))}
      </ul>
    </div>
  );
}
