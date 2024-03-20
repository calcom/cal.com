import { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import { User } from "@prisma/client";

export const GetUser = createParamDecorator<keyof User | (keyof User)[], ExecutionContext>((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as User;

  if (!user) {
    throw new Error("GetUser decorator : User not found");
  }

  if (Array.isArray(data)) {
    return data.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: request.user[curr],
      };
    }, {});
  }

  if (data) {
    return request.user[data];
  }

  return user;
});
