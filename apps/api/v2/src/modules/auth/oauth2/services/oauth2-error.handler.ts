import { ErrorWithCode, getHttpStatusCode } from "@calcom/platform-libraries/errors";
import { HttpException, Injectable, Logger } from "@nestjs/common";
import { OAuthService } from "@/lib/services/oauth.service";
import { OAuth2RedirectException } from "@/modules/auth/oauth2/filters/oauth2-redirect.exception";

const NON_REDIRECTABLE_REASONS = new Set([
  "client_not_found",
  "client_not_approved",
  "redirect_uri_mismatch",
]);

@Injectable()
export class OAuth2ErrorHandler {
  private readonly logger = new Logger("OAuth2ErrorHandler");

  constructor(private readonly oAuthService: OAuthService) {}

  handleAuthorizeError(err: unknown, redirectUri: string, state?: string): never {
    if (err instanceof ErrorWithCode) {
      const reason = err.data?.["reason"] as string | undefined;

      if (reason && NON_REDIRECTABLE_REASONS.has(reason)) {
        const statusCode = getHttpStatusCode(err);
        throw new HttpException(err.message, statusCode);
      }
    }

    const errorRedirectUrl = this.oAuthService.buildErrorRedirectUrl(redirectUri, err, state);
    throw new OAuth2RedirectException(errorRedirectUrl);
  }

  handleTokenError(err: unknown): never {
    if (err instanceof ErrorWithCode) {
      const statusCode = getHttpStatusCode(err);
      const reason = err.data?.["reason"] as string | undefined;
      throw new HttpException(
        {
          error: err.message,
          error_description: reason ?? err.message,
        },
        statusCode
      );
    }
    this.logger.error(err);
    throw new HttpException(
      {
        error: "server_error",
        error_description: "An unexpected error occurred",
      },
      500
    );
  }
}
