import { AuthGuard } from "@nestjs/passport";

export class NextAuthGuard extends AuthGuard("next-auth") {
  constructor() {
    super();
  }
}
