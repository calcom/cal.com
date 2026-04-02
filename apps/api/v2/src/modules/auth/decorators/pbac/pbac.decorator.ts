import type { PermissionString } from "@calcom/platform-libraries/pbac";
import { Reflector } from "@nestjs/core";

export const Pbac = Reflector.createDecorator<PermissionString[]>();
