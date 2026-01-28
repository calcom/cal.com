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

    // Get raw body - can be Buffer (from RawBodyMiddleware) or string/object (from tests)
    const rawBody = request.body;

    // Convert body to Buffer for consistent signature verification
    let bodyBuffer: Buffer;
    if (Buffer.isBuffer(rawBody)) {
      bodyBuffer = rawBody;
    } else if (typeof rawBody === "string") {
      bodyBuffer = Buffer.from(rawBody);
    } else if (typeof rawBody === "object" && rawBody !== null) {
      bodyBuffer = Buffer.from(JSON.stringify(rawBody));
    } else {
      this.logger.error("Request body is empty or invalid");
      throw new UnauthorizedException("Invalid request format");
    }

    const expectedSignature = crypto.createHmac("sha1", webhookSecret).update(bodyBuffer).digest("hex");

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
