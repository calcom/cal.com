import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch } from "@nestjs/common";
import type { Response } from "express";
import { OAuth2RedirectException } from "@/modules/auth/oauth2/filters/oauth2-redirect.exception";

@Catch(OAuth2RedirectException)
export class OAuth2RedirectExceptionFilter implements ExceptionFilter<OAuth2RedirectException> {
  catch(exception: OAuth2RedirectException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.redirect(303, exception.redirectUrl);
  }
}
