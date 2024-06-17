import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

@Injectable()
export class OrganizationIdGuard implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { organizationId } = request.params;

    const organization = await this.organizationsRepository.findById(Number(organizationId));

    if (!organization) {
      throw new ForbiddenException("Invalid organization id");
    }

    return true;
  }
}
