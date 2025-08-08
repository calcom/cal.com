import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import {
  createPrivateLink,
  deletePrivateLink,
  getPrivateLinks,
  updatePrivateLink,
} from "@calcom/platform-libraries/private-links";
import { CreatePrivateLinkInput, PrivateLinkOutput, UpdatePrivateLinkInput } from "@calcom/platform-types";

import { PrivateLinksInputService } from "@/ee/event-types-private-links/services/private-links-input.service";
import { PrivateLinksOutputService } from "@/ee/event-types-private-links/services/private-links-output.service";

@Injectable()
export class PrivateLinksService {
  constructor(
    private readonly inputService: PrivateLinksInputService,
    private readonly outputService: PrivateLinksOutputService
  ) {}

  async createPrivateLink(
    eventTypeId: number,
    userId: number,
    input: CreatePrivateLinkInput
  ): Promise<PrivateLinkOutput> {
    try {
      const transformedInput = this.inputService.transformCreateInput(input);
      const result = await createPrivateLink(eventTypeId, userId, transformedInput);
      return this.outputService.transformToOutput(result);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to create private link");
    }
  }

  async getPrivateLinks(eventTypeId: number, userId: number): Promise<PrivateLinkOutput[]> {
    try {
      const results = await getPrivateLinks(eventTypeId, userId);
      return this.outputService.transformArrayToOutput(results);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Failed to get private links");
    }
  }

  async updatePrivateLink(
    eventTypeId: number,
    userId: number,
    input: UpdatePrivateLinkInput
  ): Promise<PrivateLinkOutput> {
    try {
      const transformedInput = this.inputService.transformUpdateInput(input);
      const result = await updatePrivateLink(eventTypeId, userId, transformedInput);
      return this.outputService.transformToOutput(result);
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

  async deletePrivateLink(eventTypeId: number, userId: number, linkId: string): Promise<void> {
    try {
      await deletePrivateLink(eventTypeId, userId, linkId);
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


