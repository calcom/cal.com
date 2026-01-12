// Webhook Types
export interface Webhook {
  id: string;
  subscriberUrl: string;
  eventTriggers: string[];
  active: boolean;
  payloadTemplate?: string;
  secret?: string;
  eventTypeId?: number;
}

export interface CreateWebhookInput {
  subscriberUrl: string;
  eventTriggers: string[];
  active?: boolean;
  payloadTemplate?: string;
  secret?: string;
}

export interface UpdateWebhookInput {
  subscriberUrl?: string;
  eventTriggers?: string[];
  active?: boolean;
  payloadTemplate?: string;
  secret?: string;
}

export interface GetWebhooksResponse {
  status: string;
  data: Webhook[];
}

export interface GetWebhookResponse {
  status: string;
  data: Webhook;
}
