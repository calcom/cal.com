import { PrivateLinksRepository } from "@/ee/event-types-private-links/private-links.repository";
import { PrivateLinksInputService } from "@/ee/event-types-private-links/services/private-links-input.service";
import {
  PrivateLinksOutputService,
  type PrivateLinkData,
} from "@/ee/event-types-private-links/services/private-links-output.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { getOrgFullOrigin } from "@calcom/platform-libraries/private-links";
import { generateHashedLink, isLinkExpired } from "@calcom/platform-libraries/private-links";
import { CreatePrivateLinkInput, PrivateLinkOutput, UpdatePrivateLinkInput } from "@calcom/platform-types";

interface CreatePrivateLinkParams {
  eventTypeId: number;
  userId: number;
  input: CreatePrivateLinkInput;
  orgSlug?: string;
  eventTypeSlug?: string;
}

interface GetPrivateLinksParams {
  eventTypeId: number;
  orgSlug?: string;
  eventTypeSlug?: string;
}

interface UpdatePrivateLinkParams {
  eventTypeId: number;
  input: UpdatePrivateLinkInput;
  orgSlug?: string;
  eventTypeSlug?: string;
}

@Injectable()
export class PrivateLinksService {
  constructor(
    private readonly inputService: PrivateLinksInputService,
    private readonly outputService: PrivateLinksOutputService,
    private readonly repo: PrivateLinksRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14
  ) {}

  async createPrivateLink(params: CreatePrivateLinkParams): Promise<PrivateLinkOutput> {
    const { eventTypeId, userId, input, orgSlug, eventTypeSlug } = params;
    try {
      const resolvedSlug = await this.resolveEventTypeSlug(eventTypeId, eventTypeSlug);
      
      const transformedInput = this.inputService.transformCreateInput(input);
      const created = await this.repo.create(eventTypeId, {
        link: generateHashedLink(userId),
        expiresAt: transformedInput.expiresAt ?? null,
        maxUsageCount: transformedInput.maxUsageCount ?? null,
      });
      const bookingUrl = this.generateBookingUrl(created.link, resolvedSlug, orgSlug);
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

  async getPrivateLinks(params: GetPrivateLinksParams): Promise<PrivateLinkOutput[]> {
    const { eventTypeId, orgSlug, eventTypeSlug } = params;
    try {
      const resolvedSlug = await this.resolveEventTypeSlug(eventTypeId, eventTypeSlug);
      
      const links = await this.repo.listByEventTypeId(eventTypeId);
      const mapped: PrivateLinkData[] = links.map((l) => ({
        id: l.link,
        eventTypeId,
        isExpired: isLinkExpired(l),
        bookingUrl: this.generateBookingUrl(l.link, resolvedSlug, orgSlug),
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

  async updatePrivateLink(params: UpdatePrivateLinkParams): Promise<PrivateLinkOutput> {
    const { eventTypeId, input, orgSlug, eventTypeSlug } = params;
    try {
      const resolvedSlug = await this.resolveEventTypeSlug(eventTypeId, eventTypeSlug);
      
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
      const bookingUrl = this.generateBookingUrl(updated.link, resolvedSlug, orgSlug);
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

  private async resolveEventTypeSlug(
    eventTypeId: number,
    providedSlug?: string
  ): Promise<string> {
    if (providedSlug) return providedSlug;
    
    const slug = await this.eventTypesRepository.getEventTypeSlugById(eventTypeId);
    if (!slug) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found or has no slug`);
    }
    
    return slug;
  }

  private generateBookingUrl(hashedLink: string, eventTypeSlug: string, orgSlug?: string): string {
    const origin = orgSlug
      ? getOrgFullOrigin(orgSlug, { protocol: true }).replace(/\/$/, "")
      : process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com";
    return `${origin}/d/${hashedLink}/${eventTypeSlug}`;
  }
}
