import WebhookListItem from "./WebhookListItem";
import { Webhook } from "@lib/webhook";

export default function WebhookList(props: { webhooks: Webhook[]; onChange: () => void }) {
  const deleteWebhook = (webhook: Webhook) => {
    return fetch("/api/webhook/" + webhook.id, {
      method: "DELETE",
    }).then(props.onChange());
  };

  return (
    <div>
      <ul className="px-4 mb-2 bg-white border divide-y divide-gray-200 rounded">
        {props.webhooks.map((webhook: Webhook) => (
          <WebhookListItem onChange={props.onChange} key={webhook.id} webhook={webhook}></WebhookListItem>
        ))}
      </ul>
    </div>
  );
}
