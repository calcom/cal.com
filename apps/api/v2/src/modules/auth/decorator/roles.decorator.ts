import { Reflector } from "@nestjs/core";
import { MembershipRole } from "@prisma/client";

export const Roles = Reflector.createDecorator<MembershipRole[]>();
