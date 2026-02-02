import * as crypto from "node:crypto";
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class VercelWebhookGuard implements CanActivate {
  private readonly logger = new Logger(VercelWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers["x-vercel-signature"];
    // biome-ignore lint/style/noProcessEnv: Environment variable access required for webhook secret
    const webhookSecret = process.env.VERCEL_PROMOTE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error("VERCEL_PROMOTE_WEBHOOK_SECRET is not defined");
      throw new UnauthorizedException("Webhook configuration error");
    }

    if (!signature) {
      throw new UnauthorizedException("Missing x-vercel-signature header");
    }

    // Get raw body from RawBodyMiddleware (Buffer) or parsed body (object in test env)
    const rawBody = request.body;

    if (!rawBody) {
      this.logger.error("Request body is empty. Ensure RawBodyMiddleware is active.");
      throw new UnauthorizedException("Invalid request format");
    }

    // Determine the body bytes for signature verification
    // In production: RawBodyMiddleware provides a Buffer
    // In tests: body may be a parsed object, convert back to JSON string
    let bodyForSignature: Buffer | string;
    if (Buffer.isBuffer(rawBody)) {
      bodyForSignature = rawBody;
    } else if (typeof rawBody === "string") {
      bodyForSignature = rawBody;
    } else {
      // Object from parsed JSON - convert back to string (test environment)
      bodyForSignature = JSON.stringify(rawBody);
    }

    const expectedSignature = crypto.createHmac("sha1", webhookSecret).update(bodyForSignature).digest("hex");

    // Check signature length first (timingSafeEqual throws if lengths differ)
    if (signature.length !== expectedSignature.length) {
      this.logger.warn("Invalid Vercel webhook signature length");
      throw new UnauthorizedException("Invalid signature");
    }

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
