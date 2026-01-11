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

import type { PermissionString } from "@calcom/platform-libraries/pbac";
import { PermissionCheckService, FeaturesRepository } from "@calcom/platform-libraries/pbac";

export const REDIS_PBAC_CACHE_KEY = (teamId: number) => `apiv2:team:${teamId}:has:pbac:guard:pbac`;
export const REDIS_REQUIRED_PERMISSIONS_CACHE_KEY = (
  userId: number,
  teamId: number,
  requiredPermissions: PermissionString[]
) =>
  `apiv2:user:${userId}:team:${teamId}:requiredPermissions:${requiredPermissions
    .sort()
    .join(",")}:guard:pbac`;

@Injectable()
export class PbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prismaReadService: PrismaReadService,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { pbacAuthorizedRequest?: boolean }>();
    const user = request.user as ApiAuthGuardUser;
    const teamId = request.params.teamId;
    const orgId = request.params.orgId;
    const requiredPermissions = this.reflector.get(Pbac, context.getHandler());

    const effectiveTeamId = teamId || orgId;
    if (!user) {
      throw new UnauthorizedException("PbacGuard - the request does not have an authorized user provided");
    }
    if (!effectiveTeamId) {
      throw new BadRequestException(
        "PbacGuard - can't check pbac because no teamId or orgId provided within the request url"
      );
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      request.pbacAuthorizedRequest = false;
      return true;
    }

    const hasPbacEnabled = await this.hasPbacEnabled(Number(effectiveTeamId));
    if (!hasPbacEnabled) {
      request.pbacAuthorizedRequest = false;
      return true;
    }

    const hasRequiredPermissions = await this.checkUserHasRequiredPermissions(
      user.id,
      Number(effectiveTeamId),
      requiredPermissions
    );

    if (!hasRequiredPermissions) {
      request.pbacAuthorizedRequest = false;
      return true;
    }

    request.pbacAuthorizedRequest = true;
    return true;
  }

  async hasPbacEnabled(teamId: number) {
    const cachedHasPbacEnabled = await this.getCachePbacEnabled(teamId);

    if (cachedHasPbacEnabled) {
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
    const cachedAccess = await this.getCacheRequiredPermissions(userId, teamId, requiredPermissions);

    if (cachedAccess) {
      return cachedAccess;
    }

    const permissionCheckService = new PermissionCheckService();
    const hasRequiredPermissions = await permissionCheckService.checkPermissions({
      userId,
      teamId,
      permissions: requiredPermissions,
      fallbackRoles: [],
    });

    if (hasRequiredPermissions) {
      await this.setCacheRequiredPermissions(userId, teamId, requiredPermissions, hasRequiredPermissions);
    }

    return hasRequiredPermissions;
  }

  private async getCacheRequiredPermissions(
    userId: number,
    teamId: number,
    requiredPermissions: PermissionString[]
  ): Promise<boolean | null> {
    return this.redisService.get<boolean>(
      REDIS_REQUIRED_PERMISSIONS_CACHE_KEY(userId, teamId, requiredPermissions)
    );
  }

  private async setCacheRequiredPermissions(
    userId: number,
    teamId: number,
    requiredPermissions: PermissionString[],
    hasRequired: boolean
  ): Promise<void> {
    await this.redisService.set<boolean>(
      REDIS_REQUIRED_PERMISSIONS_CACHE_KEY(userId, teamId, requiredPermissions),
      hasRequired,
      { ttl: 300_000 }
    );
  }

  private async getCachePbacEnabled(teamId: number) {
    const cachedResult = await this.redisService.get<boolean>(REDIS_PBAC_CACHE_KEY(teamId));
    return cachedResult;
  }

  private async setCachePbacEnabled(teamId: number, pbacEnabled: boolean) {
    await this.redisService.set<boolean>(REDIS_PBAC_CACHE_KEY(teamId), pbacEnabled, {
      ttl: 300_000,
    });
  }

  throwForbiddenError(
    userId: number,
    teamId: string,
    orgId: string,
    requiredPermissions: PermissionString[]
  ) {
    let errorMessage = `PbacGuard - user with id=${userId} does not have the minimum required permissions=${requiredPermissions.join(
      ","
    )} `;
    if (teamId) {
      errorMessage += `within team with id=${teamId}`;
    }
    if (orgId) {
      errorMessage += `within organization with id=${orgId}`;
    }
    errorMessage += `.`;

    throw new ForbiddenException(errorMessage);
  }
}
