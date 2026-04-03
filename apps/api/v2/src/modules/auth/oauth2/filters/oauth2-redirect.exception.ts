import { HttpException, HttpStatus } from "@nestjs/common";

export class OAuth2RedirectException extends HttpException {
  readonly redirectUrl: string;

  constructor(redirectUrl: string) {
    super("OAuth2 redirect", HttpStatus.SEE_OTHER);
    this.redirectUrl = redirectUrl;
  }
}
