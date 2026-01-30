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
import { ApiExcludeController } from "@nestjs/swagger";
import { VercelWebhookGuard } from "./vercel-webhook.guard";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";

interface VercelWebhookPayload {
  type?: string;
}

@Controller({
  path: "/v2/webhooks/vercel",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
export class VercelWebhookController {
  private readonly logger = new Logger(VercelWebhookController.name);

  @Post("deployment-promoted")
  @UseGuards(VercelWebhookGuard)
  @HttpCode(HttpStatus.OK)
  async handlePromotion(
    @Body() rawBody: Buffer | VercelWebhookPayload
  ): Promise<{ status: string; version: string }> {
    // RawBodyMiddleware provides a Buffer, need to parse it
    // In test environment, body may already be parsed as object
    let payload: VercelWebhookPayload;
    if (Buffer.isBuffer(rawBody)) {
      try {
        payload = JSON.parse(rawBody.toString("utf-8")) as VercelWebhookPayload;
      } catch {
        this.logger.error("Failed to parse webhook payload as JSON");
        return { status: "error", version: "" };
      }
    } else {
      payload = rawBody;
    }

    if (payload.type !== "deployment.promoted") {
      this.logger.log(`Ignoring webhook event type: ${payload.type}`);
      return { status: "ignored", version: "" };
    }

    // biome-ignore lint/style/noProcessEnv: Environment variable access required for trigger.dev API
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
    // biome-ignore lint/style/noProcessEnv: Environment variable access required for trigger.dev API
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
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        if (errorMessage.includes("Deployment is already the current deployment")) {
          this.logger.log(`Deployment ${version} is already the current deployment, skipping retry`);
          return;
        }

        this.logger.error(`Promotion attempt ${attempt} failed: ${errorMessage}`);
        if (attempt === maxRetries) throw error;

        // Exponential backoff: 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      }
    }
  }
}
