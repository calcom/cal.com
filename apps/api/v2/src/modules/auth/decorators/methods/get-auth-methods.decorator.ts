import { AuthMethods } from "@/lib/enums/auth-methods";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const GetAuthMethod = createParamDecorator<unknown, ExecutionContext>((_data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  const authMethod = request.authMethod as AuthMethods;

  if (!authMethod) {
    throw new Error("GetAuthMethod decorator : auth method not set");
  }

  return authMethod;
});
