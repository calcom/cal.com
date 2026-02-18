import { ErrorWithCode, getHttpStatusCode } from "@calcom/platform-libraries/errors";
import { HttpException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { OAuthService } from "@/lib/services/oauth.service";
import { OAuth2HttpException } from "@/modules/auth/oauth2/filters/oauth2-http.exception";
import { OAuth2RedirectException } from "@/modules/auth/oauth2/filters/oauth2-redirect.exception";

const NON_REDIRECTABLE_REASONS = new Set([
  "client_not_found",
  "client_not_approved",
  "redirect_uri_mismatch",
]);

@Injectable()
export class OAuth2ErrorService {
  private readonly logger = new Logger("OAuth2ErrorService");

  constructor(private readonly oAuthService: OAuthService) {}

  handleAuthorizeError(err: unknown, redirectUri: string, state?: string): never {
    if (err instanceof ErrorWithCode) {
      const reason = err.data?.["reason"] as string | undefined;

      if (reason && NON_REDIRECTABLE_REASONS.has(reason)) {
        const statusCode = getHttpStatusCode(err);
        throw new OAuth2HttpException(
          {
            error: err.message,
            error_description: reason,
          },
          statusCode
        );
      }
    }

    const errorRedirectUrl = this.oAuthService.buildErrorRedirectUrl(redirectUri, err, state);
    throw new OAuth2RedirectException(errorRedirectUrl);
  }

  handleTokenError(err: unknown): never {
    if (err instanceof ErrorWithCode) {
      const statusCode = getHttpStatusCode(err);
      const reason = err.data?.["reason"] as string | undefined;
      throw new OAuth2HttpException(
        {
          error: err.message,
          error_description: reason ?? err.message,
        },
        statusCode
      );
    }
    this.logger.error(err);
    throw new OAuth2HttpException(
      {
        error: "server_error",
        error_description: "An unexpected error occurred",
      },
      500
    );
  }

  handleClientError(err: unknown, fallbackMessage: string): never {
    if (err instanceof ErrorWithCode) {
      const statusCode = getHttpStatusCode(err);
      if (statusCode >= 500) {
        this.logger.error(err);
      }
      throw new HttpException(err.message, statusCode);
    }
    this.logger.error(err);
    throw new InternalServerErrorException(fallbackMessage);
  }
}
