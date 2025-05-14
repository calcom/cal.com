import { Reflector } from "@nestjs/core";

import { MembershipRole } from "@calcom/prisma/client";

export const MembershipRoles = Reflector.createDecorator<MembershipRole[]>();
