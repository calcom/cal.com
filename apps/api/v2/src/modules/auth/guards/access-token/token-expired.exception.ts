import { HttpException } from "@nestjs/common";

const HTTP_STATUS_TOKEN_EXPIRED = 498;

export class TokenExpiredException extends HttpException {
  constructor(message: string) {
    super(message, HTTP_STATUS_TOKEN_EXPIRED);
  }
}
