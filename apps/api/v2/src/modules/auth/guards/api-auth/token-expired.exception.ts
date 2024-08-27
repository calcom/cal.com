import { HttpException } from "@nestjs/common";

import { ACCESS_TOKEN_EXPIRED, HTTP_CODE_TOKEN_EXPIRED } from "@calcom/platform-constants";

export class TokenExpiredException extends HttpException {
  constructor() {
    super(ACCESS_TOKEN_EXPIRED, HTTP_CODE_TOKEN_EXPIRED);
  }
}
