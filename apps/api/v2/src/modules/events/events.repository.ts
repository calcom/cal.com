import { GetPublicEventInput } from "@/modules/events/inputs/get-public-event.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { getUsernameList } from "@calcom/platform-libraries";

@Injectable()
export class EventsRepository {
  private dynamicEventSelector = Prisma.validator<Prisma.UserSelect>()({
    username: true,
    name: true,
    weekStart: true,
    metadata: true,
    brandColor: true,
    darkBrandColor: true,
    theme: true,
    organizationId: true,
    organization: {
      select: {
        slug: true,
        name: true,
      },
    },
  });

  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getPublicEvent(input: GetPublicEventInput) {
    const usernames = getUsernameList(input.username);
    if (usernames.length > 1) {
      // dynamic event
      return this.getDynamicEvent(input, usernames);
    }
  }

  private async getDynamicEvent(input: Omit<GetPublicEventInput, "username">, slugs: string[]) {
    const organization = input.org; // !! FIXME, see `whereClauseForOrgWithSlugOrRequestedSlug`.

    const users = await this.dbRead.prisma.user.findMany({
      where: this.buildDynamicClause(slugs, organization),
      select: this.dynamicEventSelector,
    });

    const firstUser = users[0];

    return {
      users: users.map((user) => ({
        ...user,
        metadata: undefined,
        bookerUrl: undefined, // !! FIXME
      })),
      profile: {
        username: firstUser.username,
        name: firstUser.name,
        weekStart: firstUser.weekStart,
        image: `/${firstUser.username}/avatar.png`,
        brandColor: firstUser.brandColor,
        darkBrandColor: firstUser.darkBrandColor,
        theme: null,
      },
      isInstantEvent: false,
    };
  }

  private buildDynamicClause(slugs: string[], organizationSlug: string | null) {
    return {
      username: {
        in: slugs,
      },
      ...(organizationSlug
        ? {
            organization: {
              slug: organizationSlug,
            },
          }
        : undefined),
    };
  }
}
