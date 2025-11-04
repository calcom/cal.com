import { PrivateLinksRepository } from "@/ee/event-types-private-links/private-links.repository";
import { PrivateLinksInputService } from "@/ee/event-types-private-links/services/private-links-input.service";
import {
  PrivateLinksOutputService,
  type PrivateLinkData,
} from "@/ee/event-types-private-links/services/private-links-output.service";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { getOrgFullOrigin } from "@calcom/platform-libraries/private-links";
import { generateHashedLink, isLinkExpired } from "@calcom/platform-libraries/private-links";
import { CreatePrivateLinkInput, PrivateLinkOutput, UpdatePrivateLinkInput } from "@calcom/platform-types";

@Injectable()
export class PrivateLinksService {
  constructor(
    private readonly inputService: PrivateLinksInputService,
    private readonly outputService: PrivateLinksOutputService,
    private readonly repo: PrivateLinksRepository
  ) {}

  async createPrivateLink(
    eventTypeId: number,
    userId: number,
    input: CreatePrivateLinkInput,
    orgSlug?: string,
    eventTypeSlug?: string
  ): Promise<PrivateLinkOutput> {
    try {
      const transformedInput = this.inputService.transformCreateInput(input);
      const created = await this.repo.create(eventTypeId, {
        link: generateHashedLink(userId),
        expiresAt: transformedInput.expiresAt ?? null,
        maxUsageCount: transformedInput.maxUsageCount ?? null,
      });
      const bookingUrl = this.generateBookingUrl(created.link, orgSlug, eventTypeSlug);
      const mapped: PrivateLinkData = {
        id: created.link,
        eventTypeId,
        isExpired: isLinkExpired(created),
        bookingUrl,
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

  async getPrivateLinks(
    eventTypeId: number,
    orgSlug?: string,
    eventTypeSlug?: string
  ): Promise<PrivateLinkOutput[]> {
    try {
      const links = await this.repo.listByEventTypeId(eventTypeId);
      const mapped: PrivateLinkData[] = links.map((l) => ({
        id: l.link,
        eventTypeId,
        isExpired: isLinkExpired(l),
        bookingUrl: this.generateBookingUrl(l.link, orgSlug, eventTypeSlug),
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

  async updatePrivateLink(
    eventTypeId: number,
    input: UpdatePrivateLinkInput,
    orgSlug?: string,
    eventTypeSlug?: string
  ): Promise<PrivateLinkOutput> {
    try {
      const transformedInput = this.inputService.transformUpdateInput(input);
      const updatedResult = await this.repo.update(eventTypeId, {
        link: transformedInput.linkId,
        expiresAt: transformedInput.expiresAt ?? null,
        maxUsageCount: transformedInput.maxUsageCount ?? null,
      });
      if (!updatedResult || updatedResult.count === 0) {
        throw new NotFoundException("Updated link not found");
      }
      const updated = await this.repo.findWithEventTypeDetails(transformedInput.linkId);
      if (!updated) throw new NotFoundException("Updated link not found");
      const bookingUrl = this.generateBookingUrl(updated.link, orgSlug, eventTypeSlug);
      const mapped: PrivateLinkData = {
        id: updated.link,
        eventTypeId,
        isExpired: isLinkExpired(updated),
        bookingUrl,
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

  private generateBookingUrl(hashedLink: string, orgSlug?: string, eventTypeSlug?: string): string {
    if (orgSlug && eventTypeSlug) {
      const origin = getOrgFullOrigin(orgSlug, { protocol: true }).replace(/\/$/, "");
      return `${origin}/d/${hashedLink}/${eventTypeSlug}`;
    }

    const fallbackOrigin = getOrgFullOrigin(null, { protocol: true }).replace(/\/$/, "");
    if (eventTypeSlug) {
      return `${fallbackOrigin}/d/${hashedLink}/${eventTypeSlug}`;
    }
    return `${fallbackOrigin}/d/${hashedLink}`;
  }
}
