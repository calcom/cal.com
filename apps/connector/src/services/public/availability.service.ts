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
    const data = await this.availabilityRepository.create(body);
    return data;
  }

  async delete(id: number) {
    return await this.availabilityRepository.delete(id);
  }
}