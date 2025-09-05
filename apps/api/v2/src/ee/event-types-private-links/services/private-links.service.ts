import { generateHashedLink, isLinkExpired } from "@calcom/platform-libraries/private-links";
import { CreatePrivateLinkInput, PrivateLinkOutput, UpdatePrivateLinkInput } from "@calcom/platform-types";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrivateLinksRepository } from "@/ee/event-types-private-links/private-links.repository";
import { PrivateLinksInputService } from "@/ee/event-types-private-links/services/private-links-input.service";
import {
  type PrivateLinkData,
  PrivateLinksOutputService,
} from "@/ee/event-types-private-links/services/private-links-output.service";

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
    input: CreatePrivateLinkInput
  ): Promise<PrivateLinkOutput> {
    try {
      const transformedInput = this.inputService.transformCreateInput(input);
      const created = await this.repo.create(eventTypeId, {
        link: generateHashedLink(userId),
        expiresAt: transformedInput.expiresAt ?? null,
        maxUsageCount: transformedInput.maxUsageCount ?? null,
      });
      const mapped: PrivateLinkData = {
        id: created.link,
        eventTypeId,
        isExpired: isLinkExpired(created as any),
        bookingUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com"}/d/${created.link}`,
        expiresAt: created.expiresAt ?? null,
        maxUsageCount: (created as any).maxUsageCount ?? null,
        usageCount: (created as any).usageCount ?? 0,
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
      const links = await this.repo.listByEventTypeId(eventTypeId);
      const mapped: PrivateLinkData[] = links.map((l) => ({
        id: l.link,
        eventTypeId,
        isExpired: isLinkExpired(l as any),
        bookingUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com"}/d/${l.link}`,
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
        expiresAt: transformedInput.expiresAt ?? null,
        maxUsageCount: transformedInput.maxUsageCount ?? null,
      });
      if (!updatedResult || (updatedResult as any).count === 0) {
        throw new NotFoundException("Updated link not found");
      }
      const updated = await this.repo.findWithEventTypeDetails(transformedInput.linkId);
      if (!updated) throw new NotFoundException("Updated link not found");
      const mapped: PrivateLinkData = {
        id: updated.link,
        eventTypeId,
        isExpired: isLinkExpired(updated as any),
        bookingUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com"}/d/${updated.link}`,
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
