import { CreateWebhookInputDto } from "@/modules/webhooks/inputs/create-webhook.input";
import { PipeTransform, Injectable } from "@nestjs/common";

@Injectable()
export class WebhookInputPipe implements PipeTransform {
  transform(value: CreateWebhookInputDto) {
    const { triggers, ...rest } = value;
    const eventTriggers = triggers;
    const parsedData = { ...rest, eventTriggers };
    return parsedData;
  }
}

@Injectable()
export class PartialWebhookInputPipe implements PipeTransform {
  transform(value: Partial<CreateWebhookInputDto>) {
    if (value.triggers) {
      const { triggers, ...rest } = value;
      const eventTriggers = triggers;
      const parsedData = { ...rest, eventTriggers };
      return parsedData;
    }
    return { ...value, eventTriggers: undefined };
  }
}

export type PipedInputWebhookType = ReturnType<WebhookInputPipe["transform"]>;
