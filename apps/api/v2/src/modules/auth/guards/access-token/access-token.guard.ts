import { AuthGuard } from "@nestjs/passport";

export class AccessTokenGuard extends AuthGuard("access-token") {
  constructor() {
    super();
  }
}
