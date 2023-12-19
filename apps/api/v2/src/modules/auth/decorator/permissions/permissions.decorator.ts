import { Reflector } from "@nestjs/core";

import { PLATFORM_PERMISSION } from "@calcom/platform-types";

export const Permissions = Reflector.createDecorator<PLATFORM_PERMISSION[]>();
