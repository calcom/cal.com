import { AvailabilityRepository } from "@/repositories/availability.repository";

import { PrismaClient } from "@calcom/prisma";

import { BaseService } from "../base.service";

export class AvailabilityService extends BaseService {
  private availabilityRepository: AvailabilityRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.availabilityRepository = new AvailabilityRepository(prisma);
  }
}