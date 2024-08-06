import { PipeTransform, Injectable } from "@nestjs/common";
import { Webhook } from "@prisma/client";

@Injectable()
export class WebhookOutputPipe implements PipeTransform {
  transform(value: Webhook) {
    if (value?.eventTriggers) {
      const { eventTriggers, ...rest } = value;
      const triggers = eventTriggers;
      const parsedData = { ...rest, triggers };
      return parsedData;
    }
    return value;
  }
}

export type PipedOutputWebhookType = ReturnType<WebhookOutputPipe["transform"]>;
