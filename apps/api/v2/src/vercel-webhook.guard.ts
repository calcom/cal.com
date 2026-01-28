import * as crypto from "node:crypto";
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class VercelWebhookGuard implements CanActivate {
  private readonly logger = new Logger(VercelWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers["x-vercel-signature"];
    const webhookSecret = process.env.VERCEL_PROMOTE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error("VERCEL_PROMOTE_WEBHOOK_SECRET is not defined");
      throw new UnauthorizedException("Webhook configuration error");
    }

    if (!signature) {
      throw new UnauthorizedException("Missing x-vercel-signature header");
    }

    // Since you use RawBodyMiddleware, request.body is a Buffer
    const rawBody = request.body;

    if (!Buffer.isBuffer(rawBody)) {
      this.logger.error("Request body is not a Buffer. Ensure RawBodyMiddleware is active.");
      throw new UnauthorizedException("Invalid request format");
    }

    const expectedSignature = crypto.createHmac("sha1", webhookSecret).update(rawBody).digest("hex");

    // Secure comparison to prevent timing attacks
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    );

    if (!isSignatureValid) {
      this.logger.warn("Invalid Vercel webhook signature");
      throw new UnauthorizedException("Invalid signature");
    }

    return true;
  }
}
