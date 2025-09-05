import { Reflector } from "@nestjs/core";

import { MembershipRole } from "@calcom/platform-libraries";

export const MembershipRoles = Reflector.createDecorator<MembershipRole[]>();
