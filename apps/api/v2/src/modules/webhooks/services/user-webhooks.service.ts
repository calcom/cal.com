import { PipedInputWebhookType } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

// Use string literal for runtime check to avoid SWC module resolution issues with TS-only enums
const DELEGATION_CREDENTIAL_ERROR = "DELEGATION_CREDENTIAL_ERROR" as const;

@Injectable()
export class UserWebhooksService {
  constructor(private readonly webhooksRepository: WebhooksRepository) {}

  async createUserWebhook(userId: number, body: PipedInputWebhookType) {
    if (body.eventTriggers.includes(DELEGATION_CREDENTIAL_ERROR)) {
      throw new BadRequestException(
        "DELEGATION_CREDENTIAL_ERROR trigger is only available for organization webhooks"
      );
    }

    const existingWebhook = await this.webhooksRepository.getUserWebhookByUrl(userId, body.subscriberUrl);
    if (existingWebhook) {
      throw new ConflictException("Webhook with this subscriber url already exists for this user");
    }

    return this.webhooksRepository.createUserWebhook(userId, {
      ...body,
      payloadTemplate: body.payloadTemplate ?? null,
      secret: body.secret ?? null,
    });
  }

  async getUserWebhooksPaginated(userId: number, skip: number, take: number) {
    return this.webhooksRepository.getUserWebhooksPaginated(userId, skip, take);
  }
}
