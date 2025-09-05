import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";

@Injectable()
export class IsUserOOO implements CanActivate {
  constructor(private oooRepo: UserOOORepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const oooId: string = request.params.oooId;
    const userId: string = request.params.userId;

    if (!userId) {
      throw new ForbiddenException("No user id found in request params.");
    }

    if (!oooId) {
      throw new ForbiddenException("No ooo entry id found in request params.");
    }

    const ooo = await this.oooRepo.getUserOOOByIdAndUserId(Number(oooId), Number(userId));

    if (ooo) {
      return true;
    }

    throw new ForbiddenException("This OOO entry does not belong to this user.");
  }
}
