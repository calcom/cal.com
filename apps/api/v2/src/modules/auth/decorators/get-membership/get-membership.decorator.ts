import { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

import { Membership } from "@calcom/prisma/client";

export type GetMembershipReturnType = Membership;

export const GetMembership = createParamDecorator<
  keyof GetMembershipReturnType | (keyof GetMembershipReturnType)[],
  ExecutionContext
>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const membership = request.membership as GetMembershipReturnType;

  if (!membership) {
    throw new Error("GetMembership decorator : Membership not found");
  }

  if (Array.isArray(data)) {
    return data.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: membership[curr],
      };
    }, {});
  }

  if (data) {
    return membership[data];
  }

  return membership;
});
