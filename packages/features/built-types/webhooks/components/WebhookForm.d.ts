/// <reference types="react" />
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
export type TWebhook = RouterOutputs["viewer"]["webhook"]["list"][number];
export type WebhookFormData = {
    id?: string;
    subscriberUrl: string;
    active: boolean;
    eventTriggers: WebhookTriggerEvents[];
    secret: string | null;
    payloadTemplate: string | undefined | null;
};
export type WebhookFormSubmitData = WebhookFormData & {
    changeSecret: boolean;
    newSecret: string;
};
type WebhookTriggerEventOptions = readonly {
    value: WebhookTriggerEvents;
    label: string;
}[];
declare const WEBHOOK_TRIGGER_EVENTS_GROUPED_BY_APP_V2: Record<string, WebhookTriggerEventOptions>;
declare const WebhookForm: (props: {
    webhook?: WebhookFormData | undefined;
    apps?: string[] | undefined;
    overrideTriggerOptions?: WebhookTriggerEventOptions | undefined;
    onSubmit: (event: WebhookFormSubmitData) => void;
    onCancel?: (() => void) | undefined;
    noRoutingFormTriggers: boolean;
    selectOnlyInstantMeetingOption?: boolean | undefined;
}) => JSX.Element;
export default WebhookForm;
//# sourceMappingURL=WebhookForm.d.ts.map