import { Reflector } from "@nestjs/core";

export type AllowedAuthMethod = "OAUTH_CLIENT_CREDENTIALS" | "API_KEY" | "ACCESS_TOKEN" | "NEXT_AUTH";

export const ApiAuthGuardOnlyAllow = Reflector.createDecorator<AllowedAuthMethod[]>();
