/** Documents apps/api/v2/src/lib/atoms/decorators/for-atom.decorator.ts module purpose and public usage context */
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ForAtom = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.query.for === "atom";
});
