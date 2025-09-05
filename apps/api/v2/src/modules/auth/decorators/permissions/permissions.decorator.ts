import { PERMISSIONS } from "@calcom/platform-constants";
import { Reflector } from "@nestjs/core";

export const Permissions = Reflector.createDecorator<(typeof PERMISSIONS)[number][]>();
