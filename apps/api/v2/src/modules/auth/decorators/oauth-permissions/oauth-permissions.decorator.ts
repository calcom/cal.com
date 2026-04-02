import type { NewAccessScope } from "@calcom/platform-libraries/oauth";
import { Reflector } from "@nestjs/core";

export const OAuthPermissions = Reflector.createDecorator<NewAccessScope[]>();
