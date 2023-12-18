import { AuthenticatedRequest } from "@/modules/oauth/guard/oauth-client/oauth-client.guard";
import { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import { PlatformOAuthClient } from "@prisma/client";

export const GetOAuthClient = createParamDecorator<
  keyof PlatformOAuthClient | (keyof PlatformOAuthClient)[] | undefined,
  ExecutionContext
>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  const oAuthClient = request.oAuthClient;

  if (Array.isArray(data)) {
    return data.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: request.oAuthClient[curr],
      };
    }, {});
  }

  if (data) {
    return request.oAuthClient[data];
  }

  return oAuthClient;
});
