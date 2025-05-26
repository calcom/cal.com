import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { NO_AUTH_PROVIDED_MESSAGE } from "@/modules/auth/strategies/api-auth/api-auth.strategy";

export class OptionalApiAuthGuard extends ApiAuthGuard {
  handleRequest(error: Error, user: any) {
    // note(Lauris): optional means that auth is not required but if it is invalid then still throw error.
    const noAuthProvided = error && error.message.includes(NO_AUTH_PROVIDED_MESSAGE);
    if (user || noAuthProvided || !error) {
      return user || null;
    } else {
      throw error;
    }
  }
}
