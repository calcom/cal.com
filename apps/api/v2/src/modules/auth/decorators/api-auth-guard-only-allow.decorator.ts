import { Reflector } from "@nestjs/core";

export type AllowedAuthMethod =
  | "OAUTH_CLIENT_CREDENTIALS"
  | "API_KEY"
  | "ACCESS_TOKEN"
  | "NEXT_AUTH"
  | "THIRD_PARTY_ACCESS_TOKEN";

export const ApiAuthGuardOnlyAllow = Reflector.createDecorator<AllowedAuthMethod[]>();
