import { Injectable } from "@nestjs/common";
import { PlatformOAuthClient } from "@prisma/client";

import { PERMISSIONS, PERMISSION_MAP } from "@calcom/platform-constants";
import { PlatformOAuthClientDto } from "@calcom/platform-types";

@Injectable()
export class OAuthClientsOutputService {
  transformOAuthClients(clients: PlatformOAuthClient[]): PlatformOAuthClientDto[] {
    return clients.map((client) => this.transformOAuthClient(client));
  }

  transformOAuthClient(client: PlatformOAuthClient): PlatformOAuthClientDto {
    return {
      id: client.id,
      name: client.name,
      secret: client.secret,
      permissions: this.transformOAuthClientPermissions(client.permissions),
      logo: client.logo,
      redirectUris: client.redirectUris,
      organizationId: client.organizationId,
      createdAt: client.createdAt,
      bookingRedirectUri: client.bookingRedirectUri ?? undefined,
      bookingCancelRedirectUri: client.bookingCancelRedirectUri ?? undefined,
      bookingRescheduleRedirectUri: client.bookingRescheduleRedirectUri ?? undefined,
      areEmailsEnabled: client.areEmailsEnabled,
      areDefaultEventTypesEnabled: client.areDefaultEventTypesEnabled,
      areCalendarEventsEnabled: client.areCalendarEventsEnabled,
    };
  }

  transformOAuthClientPermissions(permissions: number): Array<keyof typeof PERMISSION_MAP> {
    const permissionsNumbers = PERMISSIONS.filter((permission) => (permissions & permission) === permission);

    return permissionsNumbers.map((permission) => this.transformOAuthClientPermission(permission));
  }

  transformOAuthClientPermission(permission: (typeof PERMISSIONS)[number]): keyof typeof PERMISSION_MAP {
    return Object.entries(PERMISSION_MAP).find(
      ([_, value]) => value === permission
    )?.[0] as keyof typeof PERMISSION_MAP;
  }
}
