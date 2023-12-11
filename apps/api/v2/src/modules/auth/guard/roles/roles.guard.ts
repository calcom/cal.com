import { Roles } from "@/modules/auth/decorator/roles/roles.decorator";
import { MembershipRepository } from "@/modules/repositories/membership/membership-repository.service";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private membershipRepository: MembershipRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get(Roles, context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const membership = await this.membershipRepository.findOrgUserMembership(user.organizationId, user.id);

    const hasRequiredRole = requiredRoles.includes(membership.role);
    const isAccepted = membership.accepted;

    return user && hasRequiredRole && isAccepted;
  }
}
