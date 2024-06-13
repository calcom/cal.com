import { AuthGuard } from "@nestjs/passport";

export class AccessTokenGuard extends AuthGuard("api-auth") {
  constructor() {
    super();
  }
}
