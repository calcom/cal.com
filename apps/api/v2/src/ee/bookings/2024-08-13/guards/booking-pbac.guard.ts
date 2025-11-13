import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { Pbac } from "@/modules/auth/decorators/pbac/pbac.decorator";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { RedisService } from "@/modules/redis/redis.service";
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
import type { PermissionString } from "@calcom/platform-libraries/pbac";
import { PermissionCheckService, FeaturesRepository } from "@calcom/platform-libraries/pbac";

export const REDIS_BOOKING_PBAC_CACHE_KEY = (teamId: number) => `apiv2:team:${teamId}:has:pbac:booking`;
export const REDIS_BOOKING_REQUIRED_PERMISSIONS_CACHE_KEY = (
  userId: number,
  bookingUid: string,
  requiredPermissions: PermissionString[]
) => `apiv2:user:${userId}:booking:${bookingUid}:requiredPermissions:${requiredPermissions.sort().join(",")}`;

@Injectable()
export class BookingPbacGuard implements CanActivate {
  private bookingAccessService: BookingAccessService;

  constructor(
    private reflector: Reflector,
    private prismaReadService: PrismaReadService,
    private readonly redisService: RedisService,
    private readonly bookingsRepository: BookingsRepository_2024_08_13
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

    if (!requiredPermissions || requiredPermissions.length === 0) {
      const hasAccess = await this.bookingAccessService.doesUserIdHaveAccessToBooking({
        userId: user.id,
        bookingUid,
      });

      if (!hasAccess) {
        throw new ForbiddenException(
          `BookingPbacGuard - user with id=${user.id} does not have access to booking with uid=${bookingUid}`
        );
      }

      request.pbacAuthorizedRequest = false;
      return true;
    }

    const cachedAccess = await this.getCacheRequiredPermissions(user.id, bookingUid, requiredPermissions);
    if (cachedAccess !== null) {
      request.pbacAuthorizedRequest = cachedAccess;
      if (!cachedAccess) {
        throw new ForbiddenException(
          `BookingPbacGuard - user with id=${user.id} does not have the required permissions=${requiredPermissions.join(",")} for booking with uid=${bookingUid}`
        );
      }
      return true;
    }

    const hasAccess = await this.bookingAccessService.doesUserIdHaveAccessToBooking({
      userId: user.id,
      bookingUid,
    });

    if (hasAccess) {
      await this.setCacheRequiredPermissions(user.id, bookingUid, requiredPermissions, true);
      request.pbacAuthorizedRequest = true;
      return true;
    }

    const booking = await this.bookingsRepository.getByUidWithEventType(bookingUid);

    if (!booking) {
      throw new BadRequestException(`BookingPbacGuard - booking with uid=${bookingUid} not found`);
    }

    if (!booking.eventType?.teamId) {
      await this.setCacheRequiredPermissions(user.id, bookingUid, requiredPermissions, false);
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${user.id} does not have access to booking with uid=${bookingUid}`
      );
    }

    const teamId = booking.eventType.teamId;
    const hasPbacEnabled = await this.hasPbacEnabled(teamId);

    if (!hasPbacEnabled) {
      await this.setCacheRequiredPermissions(user.id, bookingUid, requiredPermissions, false);
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${user.id} does not have access to booking with uid=${bookingUid}`
      );
    }

    const hasRequiredPermissions = await this.checkUserHasRequiredPermissions(
      user.id,
      teamId,
      requiredPermissions
    );

    if (!hasRequiredPermissions) {
      await this.setCacheRequiredPermissions(user.id, bookingUid, requiredPermissions, false);
      throw new ForbiddenException(
        `BookingPbacGuard - user with id=${user.id} does not have the required permissions=${requiredPermissions.join(",")} for team with id=${teamId}`
      );
    }

    await this.setCacheRequiredPermissions(user.id, bookingUid, requiredPermissions, true);
    request.pbacAuthorizedRequest = true;
    return true;
  }

  async hasPbacEnabled(teamId: number) {
    const cachedHasPbacEnabled = await this.getCachePbacEnabled(teamId);

    if (cachedHasPbacEnabled !== null) {
      return cachedHasPbacEnabled;
    }

    const pbacFeatureFlag = "pbac";
    const featuresRepository = new FeaturesRepository(this.prismaReadService.prisma);
    const hasPbacEnabled = await featuresRepository.checkIfTeamHasFeature(teamId, pbacFeatureFlag);

    if (hasPbacEnabled) {
      await this.setCachePbacEnabled(teamId, hasPbacEnabled);
    }

    return hasPbacEnabled;
  }

  async checkUserHasRequiredPermissions(
    userId: number,
    teamId: number,
    requiredPermissions: PermissionString[]
  ) {
    const permissionCheckService = new PermissionCheckService();
    const hasRequiredPermissions = await permissionCheckService.checkPermissions({
      userId,
      teamId,
      permissions: requiredPermissions,
      fallbackRoles: [],
    });

    return hasRequiredPermissions;
  }

  private async getCacheRequiredPermissions(
    userId: number,
    bookingUid: string,
    requiredPermissions: PermissionString[]
  ): Promise<boolean | null> {
    return this.redisService.get<boolean>(
      REDIS_BOOKING_REQUIRED_PERMISSIONS_CACHE_KEY(userId, bookingUid, requiredPermissions)
    );
  }

  private async setCacheRequiredPermissions(
    userId: number,
    bookingUid: string,
    requiredPermissions: PermissionString[],
    hasRequired: boolean
  ): Promise<void> {
    await this.redisService.set<boolean>(
      REDIS_BOOKING_REQUIRED_PERMISSIONS_CACHE_KEY(userId, bookingUid, requiredPermissions),
      hasRequired,
      { ttl: 300_000 }
    );
  }

  private async getCachePbacEnabled(teamId: number): Promise<boolean | null> {
    const cachedResult = await this.redisService.get<boolean>(REDIS_BOOKING_PBAC_CACHE_KEY(teamId));
    return cachedResult;
  }

  private async setCachePbacEnabled(teamId: number, pbacEnabled: boolean) {
    await this.redisService.set<boolean>(REDIS_BOOKING_PBAC_CACHE_KEY(teamId), pbacEnabled, {
      ttl: 300_000,
    });
  }
}
