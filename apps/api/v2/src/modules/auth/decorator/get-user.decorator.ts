import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "@prisma/client";

export const GetUser = createParamDecorator(
  (data: keyof User | keyof User[], ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

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
  }
);
