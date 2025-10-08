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
import type { Team } from "@calcom/prisma/client";

@Injectable()
export class PbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prismaReadService: PrismaReadService,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const user = request.user as ApiAuthGuardUser;
    const teamId = request.params.teamId;
    const orgId = request.params.orgId;
    const requiredPermissions = this.reflector.get(Pbac, context.getHandler());

    if (!user) {
      throw new UnauthorizedException("PbacGuard - the request does not have an authorized user provided");
    }
    if (!teamId) {
      throw new BadRequestException(
        "PbacGuard - can't check pbac because no teamId provided within the request url"
      );
    }
    if (!this.hasPbacEnabled(Number(teamId))) {
      return true;
    }

    const hasRequiredPermissions = await this.checkUserHasRequiredPermissions(
      user.id,
      Number(teamId),
      requiredPermissions
    );

    if (!hasRequiredPermissions) {
      this.throwForbiddenError(user.id, teamId, orgId, requiredPermissions);
    }

    return true;
  }

  async hasPbacEnabled(teamId: number) {
    const REDIS_CACHE_KEY = `apiv2:team:${teamId ?? "none"}:has:pbac:guard:pbac`;
    const cachedHasPbacEnabled = JSON.parse((await this.redisService.redis.get(REDIS_CACHE_KEY)) ?? "false");

    if (cachedHasPbacEnabled) {
      return cachedHasPbacEnabled;
    }

    const pbacFeatureFlag = "pbac";
    const featuresRepository = new FeaturesRepository(this.prismaReadService.prisma);
    const hasPbacEnabled = await featuresRepository.checkIfTeamHasFeature(teamId, pbacFeatureFlag);

    if (hasPbacEnabled) {
      await this.redisService.redis.set(REDIS_CACHE_KEY, String(cachedHasPbacEnabled), "EX", 300);
    }

    return hasPbacEnabled;
  }

  async checkUserHasRequiredPermissions(
    userId: number,
    teamId: number,
    requiredPermissions: PermissionString[]
  ) {
    const REDIS_CACHE_KEY = `apiv2:user:${userId ?? "none"}:team:${
      teamId ?? "none"
    }:requiredPermissions:${requiredPermissions.join(",")}:guard:pbac`;
    const cachedAccess = JSON.parse((await this.redisService.redis.get(REDIS_CACHE_KEY)) ?? "false");

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
      await this.redisService.redis.set(REDIS_CACHE_KEY, String(hasRequiredPermissions), "EX", 300);
    }

    return hasRequiredPermissions;
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
