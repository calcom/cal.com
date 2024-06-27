import { Reflector } from "@nestjs/core";
import { MembershipRole } from "@prisma/client";

export const MembershipRoles = Reflector.createDecorator<MembershipRole[]>();
