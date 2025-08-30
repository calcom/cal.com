import { Reflector } from "@nestjs/core";

import { PERMISSIONS } from "@calcom/platform-constants";

export const Permissions = Reflector.createDecorator<(typeof PERMISSIONS)[number][]>();
