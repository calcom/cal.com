import { UserWithProfile } from "@/modules/users/users.repository";
import { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";

export type GetUserReturnType = UserWithProfile & { isSystemAdmin: boolean };

export const GetUser = createParamDecorator<
  keyof GetUserReturnType | (keyof GetUserReturnType)[],
  ExecutionContext
>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as GetUserReturnType;

  if (!user) {
    throw new Error("GetUser decorator : User not found");
  }

  user.isSystemAdmin = user.role === "ADMIN";

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
