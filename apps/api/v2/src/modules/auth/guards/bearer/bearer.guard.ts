import { AuthGuard } from "@nestjs/passport";

export class BearerGuard extends AuthGuard("bearer") {
  constructor() {
    super();
  }
}
