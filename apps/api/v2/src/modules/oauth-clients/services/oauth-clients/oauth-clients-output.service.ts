import { Injectable } from "@nestjs/common";
import { PlatformOAuthClient } from "@prisma/client";

import { PERMISSIONS, PERMISSION_MAP } from "@calcom/platform-constants";
import { PlatformOAuthClientDto } from "@calcom/platform-types";

@Injectable()
export class OAuthClientsOutputService {
  transformPermissions(permissionsNumber: number): Array<keyof typeof PERMISSION_MAP> {
    const permissionNumbers = PERMISSIONS.filter(
      (permission) => (permissionsNumber & permission) === permission
    );

    return permissionNumbers.map(
      (permission) =>
        Object.entries(PERMISSION_MAP).find(
          ([_, value]) => value === permission
        )?.[0] as keyof typeof PERMISSION_MAP
    );
  }

  transformOAuthClient(client: PlatformOAuthClient): PlatformOAuthClientDto {
    return {
      id: client.id,
      name: client.name,
      secret: client.secret,
      permissions: this.transformPermissions(client.permissions),
      logo: client.logo,
      redirectUris: client.redirectUris,
      organizationId: client.organizationId,
      createdAt: client.createdAt,
      bookingRedirectUri: client.bookingRedirectUri ?? undefined,
      bookingCancelRedirectUri: client.bookingCancelRedirectUri ?? undefined,
      bookingRescheduleRedirectUri: client.bookingRescheduleRedirectUri ?? undefined,
      areEmailsEnabled: client.areEmailsEnabled,
    };
  }

  transformOAuthClients(clients: PlatformOAuthClient[]): PlatformOAuthClientDto[] {
    return clients.map((client) => this.transformOAuthClient(client));
  }
}
