import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator<
  keyof ApiAuthGuardUser | (keyof ApiAuthGuardUser)[],
  ExecutionContext
>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as ApiAuthGuardUser;

  if (!user) {
    throw new Error("GetUser decorator : User not found");
  }

  if (Array.isArray(data)) {
    return data.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: user[curr],
      };
    }, {});
  }

  if (data) {
    return user[data];
  }

  return user;
});
