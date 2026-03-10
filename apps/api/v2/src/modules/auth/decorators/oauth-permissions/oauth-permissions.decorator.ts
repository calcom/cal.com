import type { NewAccessScope } from "@calcom/platform-libraries";
import { Reflector } from "@nestjs/core";

export const OAuthPermissions = Reflector.createDecorator<NewAccessScope[]>();
