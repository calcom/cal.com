import { AvailabilityRepository } from "@/repositories/availability.repository";

import { PrismaClient } from "@calcom/prisma";

import { BaseService } from "../base.service";

import {AvailabilityCreation} from '@/types/availability';

export class AvailabilityService extends BaseService {
  private availabilityRepository: AvailabilityRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.availabilityRepository = new AvailabilityRepository(prisma);
  }

  async create(body: AvailabilityCreation) {
    try {
      const data = await this.availabilityRepository.create(body);
      return data;
    } catch (error) {
      this.logError("create", error);
      throw error;
    }
  }

  async delete(id: number) {
    try {
      return await this.availabilityRepository.delete(id);
    } catch (error) {
      this.logError("delete", error);
      throw error;
    }
  }

  async update(body: AvailabilityCreation, userId: number, availabilityId: number) {
    try {
      const data = await this.availabilityRepository.update(body, userId, availabilityId);
      return data;
    } catch (error) {
      this.logError("update", error);
      throw error;
    }
  }
}