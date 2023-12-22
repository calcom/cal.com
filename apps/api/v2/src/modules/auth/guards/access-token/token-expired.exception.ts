import { HttpException } from "@nestjs/common";

import { ACCESS_TOKEN_EXPIRED } from "@calcom/platform-constants";

const HTTP_STATUS_TOKEN_EXPIRED = 498;

export class TokenExpiredException extends HttpException {
  constructor() {
    super(ACCESS_TOKEN_EXPIRED, HTTP_STATUS_TOKEN_EXPIRED);
  }
}
