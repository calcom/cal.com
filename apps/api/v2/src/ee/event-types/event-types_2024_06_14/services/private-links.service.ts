import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import {
  createPrivateLink,
  getPrivateLinks,
  updatePrivateLink,
  deletePrivateLink,
} from "@calcom/platform-libraries/private-links";
import {
  CreatePrivateLinkInput_2024_06_14,
  UpdatePrivateLinkInput_2024_06_14,
  PrivateLinkOutput_2024_06_14,
} from "@calcom/platform-types";

import { PrivateLinksInputService_2024_06_14 } from "./private-links-input.service";
import { PrivateLinksOutputService_2024_06_14 } from "./private-links-output.service";

@Injectable()
export class PrivateLinksService_2024_06_14 {
  constructor(
    private readonly inputService: PrivateLinksInputService_2024_06_14,
    private readonly outputService: PrivateLinksOutputService_2024_06_14
  ) {}

  async createPrivateLink(
    eventTypeId: number,
    userId: number,
    input: CreatePrivateLinkInput_2024_06_14
  ): Promise<PrivateLinkOutput_2024_06_14> {
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

  async getPrivateLinks(eventTypeId: number, userId: number): Promise<PrivateLinkOutput_2024_06_14[]> {
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
    input: UpdatePrivateLinkInput_2024_06_14
  ): Promise<PrivateLinkOutput_2024_06_14> {
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
