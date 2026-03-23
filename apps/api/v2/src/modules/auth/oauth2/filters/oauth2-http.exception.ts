import { HttpException } from "@nestjs/common";

export class OAuth2HttpException extends HttpException {
  constructor(
    public readonly oAuthErrorData: { error: string; error_description: string },
    statusCode: number
  ) {
    super(oAuthErrorData, statusCode);
  }
}
