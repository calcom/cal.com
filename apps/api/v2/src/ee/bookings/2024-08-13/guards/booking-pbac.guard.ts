import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { Pbac } from "@/modules/auth/decorators/pbac/pbac.decorator";
import { PbacGuard } from "@/modules/auth/guards/pbac/pbac.guard";
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
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { BookingAccessService } from "@calcom/platform-libraries";

@Injectable()
export class BookingPbacGuard implements CanActivate {
  private bookingAccessService: BookingAccessService;

  constructor(
    private reflector: Reflector,
    private readonly prismaReadService: PrismaReadService,
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly pbacGuard: PbacGuard
  ) {
    this.bookingAccessService = new BookingAccessService(this.prismaReadService.prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { pbacAuthorizedRequest?: boolean }>();
    const user = request.user as ApiAuthGuardUser;
    const bookingUid = request.params.bookingUid;
    const requiredPermissions = this.reflector.get(Pbac, context.getHandler());

    if (!user) {
      throw new UnauthorizedException(
        "BookingPbacGuard - the request does not have an authorized user provided"
      );
    }

    if (!bookingUid) {
      throw new BadRequestException(
        "BookingPbacGuard - bookingUid is required in the request URL parameters"
      );
    }

    // Step 1: Check resource-specific access (owner/host/admin)
    const hasDirectAccess = await this.bookingAccessService.doesUserIdHaveAccessToBooking({
      userId: user.id,
      bookingUid,
    });

    if (hasDirectAccess) {
      request.pbacAuthorizedRequest = false;
      return true;
    }

    // Step 2: User is not owner/host/admin - check if PBAC grants access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${user.id} does not have access to booking with uid=${bookingUid}`
      );
    }

    const booking = await this.bookingsRepository.getByUidWithEventType(bookingUid);

    if (!booking) {
      throw new BadRequestException(`BookingPbacGuard - booking with uid=${bookingUid} not found`);
    }

    const teamId = booking.eventType?.teamId;

    if (!teamId) {
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${user.id} does not have access to booking with uid=${bookingUid}`
      );
    }

    // Check if PBAC is enabled for this team
    const hasPbacEnabled = await this.pbacGuard.hasPbacEnabled(teamId);

    if (!hasPbacEnabled) {
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${user.id} does not have access to booking with uid=${bookingUid}`
      );
    }

    // Check PBAC permissions
    const hasPbacPermissions = await this.pbacGuard.checkUserHasRequiredPermissions(
      user.id,
      teamId,
      requiredPermissions
    );

    if (!hasPbacPermissions) {
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${
          user.id
        } does not have the required permissions=${requiredPermissions.join(",")} for team with id=${teamId}`
      );
    }

    request.pbacAuthorizedRequest = true;
    return true;
  }
}
