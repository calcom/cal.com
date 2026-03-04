import { getBookerBaseUrlSync } from "@calcom/platform-libraries/organizations";
import { generateHashedLink, isLinkExpired } from "@calcom/platform-libraries/private-links";
import { CreatePrivateLinkInput, PrivateLinkOutput, UpdatePrivateLinkInput } from "@calcom/platform-types";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrivateLinksRepository } from "@/ee/event-types-private-links/shared/private-links.repository";
import { PrivateLinksInputService } from "@/ee/event-types-private-links/shared/private-links-input.service";
import {
  type PrivateLinkData,
  PrivateLinksOutputService,
} from "@/ee/event-types-private-links/shared/private-links-output.service";

type HashedLinkWithEventTypeSlugAndOrg = {
  link: string;
  expiresAt: Date | null;
  maxUsageCount: number;
  usageCount: number;
  eventType: {
    slug: string;
    team: { slug: string | null; isOrganization: boolean; parent: { slug: string | null } | null } | null;
    owner: { profiles: { username: string; organization: { slug: string | null } }[] } | null;
  };
};

@Injectable()
export class PrivateLinksService_2024_09_04 {
  constructor(
    private readonly inputService: PrivateLinksInputService,
    private readonly outputService: PrivateLinksOutputService,
    private readonly repo: PrivateLinksRepository
  ) {}

  private buildBookingUrl(hashedLink: HashedLinkWithEventTypeSlugAndOrg): string {
    const eventSlug = hashedLink.eventType.slug;
    const orgSlug = this.resolveOrgSlug(hashedLink);
    const baseUrl = getBookerBaseUrlSync(orgSlug).replace(/\/$/, "");

    return `${baseUrl}/d/${hashedLink.link}/${eventSlug}`;
  }

  private resolveOrgSlug(hashedLink: HashedLinkWithEventTypeSlugAndOrg): string | null {
    const team = hashedLink.eventType.team;
    if (team) {
      if (team.parent?.slug) {
        return team.parent.slug;
      }
      if (team.isOrganization && team.slug) {
        return team.slug;
      }
    }

    const ownerProfile = hashedLink.eventType.owner?.profiles[0];
    if (ownerProfile?.organization?.slug) {
      return ownerProfile.organization.slug;
    }

    return null;
  }

  async createPrivateLink(
    eventTypeId: number,
    userId: number,
    input: CreatePrivateLinkInput
  ): Promise<PrivateLinkOutput> {
    try {
      const transformedInput = this.inputService.transformCreateInput(input);
      const created = await this.repo.createIncludeEventTypeSlugAndOrg(eventTypeId, {
        link: generateHashedLink(userId),
        expiresAt: transformedInput.expiresAt ?? null,
        maxUsageCount: transformedInput.maxUsageCount ?? null,
      });
      const mapped: PrivateLinkData = {
        id: created.link,
        eventTypeId,
        isExpired: isLinkExpired(created),
        bookingUrl: this.buildBookingUrl(created),
        expiresAt: created.expiresAt ?? null,
        maxUsageCount: created.maxUsageCount ?? null,
        usageCount: created.usageCount ?? 0,
      };
      return this.outputService.transformToOutput(mapped);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to create private link");
    }
  }

  async getPrivateLinks(eventTypeId: number): Promise<PrivateLinkOutput[]> {
    try {
      const links = await this.repo.listByEventTypeIdIncludeEventTypeSlugAndOrg(eventTypeId);
      const mapped: PrivateLinkData[] = links.map((l) => ({
        id: l.link,
        eventTypeId,
        isExpired: isLinkExpired(l),
        bookingUrl: this.buildBookingUrl(l),
        expiresAt: l.expiresAt ?? null,
        maxUsageCount: l.maxUsageCount ?? null,
        usageCount: l.usageCount ?? 0,
      }));
      return this.outputService.transformArrayToOutput(mapped);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to get private links");
    }
  }

  async updatePrivateLink(eventTypeId: number, input: UpdatePrivateLinkInput): Promise<PrivateLinkOutput> {
    try {
      const transformedInput = this.inputService.transformUpdateInput(input);
      const updatedResult = await this.repo.update(eventTypeId, {
        link: transformedInput.linkId,
        expiresAt: transformedInput.expiresAt,
        maxUsageCount: transformedInput.maxUsageCount ?? null,
      });
      if (!updatedResult || updatedResult.count === 0) {
        throw new NotFoundException("Updated link not found");
      }
      const updated = await this.repo.findByLinkIncludeEventTypeSlugAndOrg(transformedInput.linkId);
      if (!updated) throw new NotFoundException("Updated link not found");
      const mapped: PrivateLinkData = {
        id: updated.link,
        eventTypeId,
        isExpired: isLinkExpired(updated),
        bookingUrl: this.buildBookingUrl(updated),
        expiresAt: updated.expiresAt ?? null,
        maxUsageCount: updated.maxUsageCount ?? null,
        usageCount: updated.usageCount ?? 0,
      };
      return this.outputService.transformToOutput(mapped);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to update private link");
    }
  }

  async deletePrivateLink(eventTypeId: number, linkId: string): Promise<void> {
    try {
      const { count } = await this.repo.delete(eventTypeId, linkId);
      if (count === 0) {
        throw new NotFoundException("Deleted link not found");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to delete private link");
    }
  }
}
