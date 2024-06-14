import { AuthGuard } from "@nestjs/passport";

export class ApiAuthGuard extends AuthGuard("api-auth") {
  constructor() {
    super();
  }
}
