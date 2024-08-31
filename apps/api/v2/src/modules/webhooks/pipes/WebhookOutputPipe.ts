import { PipeTransform, Injectable } from "@nestjs/common";
import { Webhook } from "@prisma/client";

@Injectable()
export class WebhookOutputPipe implements PipeTransform {
  transform(value: Webhook) {
    const { eventTriggers, platformOAuthClientId, ...rest } = value;
    return { ...rest, triggers: eventTriggers, oAuthClientId: platformOAuthClientId };
  }
}

export type PipedOutputWebhookType = ReturnType<WebhookOutputPipe["transform"]>;
