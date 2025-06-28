import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";

export const GetOrgId = createParamDecorator((_: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest();
  const organizationId = request.organizationId;

  if (!organizationId) {
    throw new UnauthorizedException("GetOrgId decorator: Organization ID not found");
  }

  return organizationId;
});
