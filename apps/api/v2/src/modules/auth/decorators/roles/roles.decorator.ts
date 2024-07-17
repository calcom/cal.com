import { SYSTEM_ADMIN_ROLE, ORG_ROLES, TEAM_ROLES } from "@/lib/roles/constants";
import { Reflector } from "@nestjs/core";

export const Roles = Reflector.createDecorator<
  (typeof ORG_ROLES)[number] | (typeof TEAM_ROLES)[number] | typeof SYSTEM_ADMIN_ROLE
>();
