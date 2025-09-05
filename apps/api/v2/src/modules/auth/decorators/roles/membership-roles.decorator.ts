import { MembershipRole } from "@calcom/platform-libraries";
import { Reflector } from "@nestjs/core";

export const MembershipRoles = Reflector.createDecorator<MembershipRole[]>();
