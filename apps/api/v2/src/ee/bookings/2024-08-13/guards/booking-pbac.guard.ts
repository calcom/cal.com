import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";

import { BookingAccessService } from "@calcom/platform-libraries";

@Injectable()
export class BookingPbacGuard implements CanActivate {
  private bookingAccessService: BookingAccessService;

  constructor(private readonly prismaReadService: PrismaReadService) {
    this.bookingAccessService = new BookingAccessService(this.prismaReadService.prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: ApiAuthGuardUser; pbacAuthorizedRequest?: boolean }>();
    const user = request.user;
    const bookingUid = request.params.bookingUid;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!bookingUid) {
      throw new BadRequestException("BookingPbacGuard - bookingUid is required");
    }

    const hasAccess = await this.bookingAccessService.doesUserIdHaveAccessToBooking({
      userId: user.id,
      bookingUid,
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${user.id} does not have access to booking with uid=${bookingUid}`
      );
    }

    request.pbacAuthorizedRequest = true;
    return true;
  }
}
