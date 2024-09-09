/// <reference types="react" />
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
type WebhookProps = {
    id: string;
    subscriberUrl: string;
    payloadTemplate: string | null;
    active: boolean;
    eventTriggers: WebhookTriggerEvents[];
    secret: string | null;
    eventTypeId: number | null;
    teamId: number | null;
};
export default function WebhookListItem(props: {
    webhook: WebhookProps;
    canEditWebhook?: boolean;
    onEditWebhook: () => void;
    lastItem: boolean;
    readOnly?: boolean;
}): JSX.Element;
export {};
//# sourceMappingURL=WebhookListItem.d.ts.map