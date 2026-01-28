import * as crypto from "node:crypto";
import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  VERSION_NEUTRAL,
  Version,
} from "@nestjs/common";
import type { Request } from "express";

@Controller()
export class AppController {
  private readonly logger = new Logger("AppController");

  @Get("health")
  @Version(VERSION_NEUTRAL)
  getHealth(): "OK" {
    return "OK";
  }

  @Post("webhooks/vercel/deployment-promoted")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  async handleVercelDeploymentPromoted(
    @Req() request: Request,
    @Headers("x-vercel-signature") vercelSignature: string
  ): Promise<{ status: string }> {
    // biome-ignore lint/style/noProcessEnv: Environment variable access required for webhook secret
    const webhookSecret = process.env.VERCEL_PROMOTE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error("Missing VERCEL_PROMOTE_WEBHOOK_SECRET configuration");
      throw new UnauthorizedException("Webhook secret not configured");
    }

    if (!vercelSignature) {
      this.logger.warn("Missing x-vercel-signature header in webhook request");
      throw new UnauthorizedException("Missing signature");
    }

    const rawBody = request.body;
    let rawBodyBuffer: Buffer;
    if (Buffer.isBuffer(rawBody)) {
      rawBodyBuffer = rawBody;
    } else {
      rawBodyBuffer = Buffer.from(JSON.stringify(rawBody), "utf-8");
    }
    const expectedSignature = crypto.createHmac("sha1", webhookSecret).update(rawBodyBuffer).digest("hex");

    if (expectedSignature !== vercelSignature) {
      this.logger.warn("Webhook signature validation failed");
      throw new UnauthorizedException("Invalid signature");
    }

    this.logger.log("Vercel deployment promoted webhook received, promoting trigger.dev deployment");

    await this.promoteTriggerDeployment();

    return { status: "success" };
  }

  private async promoteTriggerDeployment(maxRetries: number = 3): Promise<void> {
    // biome-ignore lint/style/noProcessEnv: Environment variable access required for trigger.dev API
    const triggerApiKey = process.env.TRIGGER_API_KEY;
    // biome-ignore lint/style/noProcessEnv: Environment variable access required for trigger.dev API
    const triggerVersion = process.env.TRIGGER_VERSION;

    if (!triggerApiKey || !triggerVersion) {
      this.logger.error("Missing TRIGGER_API_KEY or TRIGGER_VERSION environment variables");
      throw new Error("Trigger.dev configuration missing");
    }

    const url = `https://api.trigger.dev/api/v1/deployments/${triggerVersion}/promote`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${triggerApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Trigger.dev API returned ${response.status}: ${errorText}`);
        }

        this.logger.log(`Successfully promoted trigger.dev deployment version ${triggerVersion}`);
        return;
      } catch (error) {
        this.logger.error(
          `Attempt ${attempt}/${maxRetries} failed to promote trigger.dev deployment: ${error}`
        );

        if (attempt === maxRetries) {
          throw error;
        }

        const delayMs = 2 ** attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
