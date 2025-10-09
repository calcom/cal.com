import { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

import type { Team } from "@calcom/prisma/client";

export type GetOrgReturnType = Team;

export const GetOrg = createParamDecorator<
  keyof GetOrgReturnType | (keyof GetOrgReturnType)[],
  ExecutionContext
>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const organization = request.organization as GetOrgReturnType;

  if (!organization) {
    throw new Error("GetOrg decorator : Org not found");
  }

  if (Array.isArray(data)) {
    return data.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: organization[curr],
      };
    }, {});
  }

  if (data) {
    return organization[data];
  }

  return organization;
});
