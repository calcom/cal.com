import { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

import type { Team } from "@calcom/prisma/client";

export type GetTeamReturnType = Team;

export const GetTeam = createParamDecorator<
  keyof GetTeamReturnType | (keyof GetTeamReturnType)[],
  ExecutionContext
>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const team = request.team as GetTeamReturnType;

  if (!team) {
    throw new Error("GetTeam decorator : Team not found");
  }

  if (Array.isArray(data)) {
    return data.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: team[curr],
      };
    }, {});
  }

  if (data) {
    return team[data];
  }

  return team;
});
