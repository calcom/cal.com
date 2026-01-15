import { Reflector } from "@nestjs/core";

import type { PermissionString } from "@calcom/platform-libraries/pbac";

export const Pbac = Reflector.createDecorator<PermissionString[]>();
