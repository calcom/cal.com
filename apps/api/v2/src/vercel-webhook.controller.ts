// vercel-webhook.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { VercelWebhookGuard } from "./vercel-webhook.guard";

@Controller("webhooks/vercel")
export class VercelWebhookController {
  private readonly logger = new Logger(VercelWebhookController.name);

  @Post("deployment-promoted")
  @UseGuards(VercelWebhookGuard) // Guard handles all security
  @HttpCode(HttpStatus.OK)
  async handlePromotion(@Body() payload: any): Promise<{ status: string; version: string }> {
    // Optional: Filter only for the 'deployment.promoted' event type
    if (payload.type !== "deployment.promoted") {
      return { status: "ignored", version: "" };
    }

    const TRIGGER_VERSION = process.env.TRIGGER_VERSION;

    if (!TRIGGER_VERSION) {
      this.logger.error("TRIGGER_VERSION is not defined");
      throw new UnauthorizedException("Trigger.dev configuration error");
    }

    this.logger.log(`Vercel Promoted! Promoting Trigger.dev to: ${TRIGGER_VERSION}`);

    await this.promoteTriggerDeployment(TRIGGER_VERSION);

    return { status: "success", version: TRIGGER_VERSION };
  }

  private async promoteTriggerDeployment(version: string, maxRetries: number = 3): Promise<void> {
    const triggerSecretKey = process.env.TRIGGER_SECRET_KEY;

    const url = `https://api.trigger.dev/api/v1/deployments/${version}/promote`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${triggerSecretKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Trigger.dev API Error (${response.status}): ${errorText}`);
        }

        this.logger.log(`Successfully promoted Trigger.dev deployment: ${version}`);
        return;
      } catch (error) {
        this.logger.error(
          `Promotion attempt ${attempt} failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        if (attempt === maxRetries) throw error;

        // Exponential backoff: 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      }
    }
  }
}
