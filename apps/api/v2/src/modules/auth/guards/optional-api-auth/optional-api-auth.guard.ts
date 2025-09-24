import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import {
  NO_AUTH_PROVIDED_MESSAGE,
  ONLY_CLIENT_ID_PROVIDED_MESSAGE,
  ONLY_CLIENT_SECRET_PROVIDED_MESSAGE,
} from "@/modules/auth/strategies/api-auth/api-auth.strategy";

export class OptionalApiAuthGuard extends ApiAuthGuard {
  handleRequest(error: Error, user: any) {
    // note(Lauris): optional means that auth is not required but if it is invalid then still throw error.
    const noAuthProvided = error && error.message.includes(NO_AUTH_PROVIDED_MESSAGE);
    const onlyClientIdProvided = error && error.message.includes(ONLY_CLIENT_ID_PROVIDED_MESSAGE);
    const onlyClientSecretProvided = error && error.message.includes(ONLY_CLIENT_SECRET_PROVIDED_MESSAGE);

    if (onlyClientIdProvided) {
      return null;
    }

    if (onlyClientSecretProvided) {
      return null;
    }

    if (user || noAuthProvided || !error) {
      return user || null;
    } else {
      throw error;
    }
  }
}
