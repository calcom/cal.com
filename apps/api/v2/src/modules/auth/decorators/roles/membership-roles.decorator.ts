import { Reflector } from "@nestjs/core";

import { MembershipRole } from "@calcom/prisma/enums";

export const MembershipRoles = Reflector.createDecorator<MembershipRole[]>();
