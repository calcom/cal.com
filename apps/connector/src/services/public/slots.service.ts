import { SlotsRepository } from "@/repositories/slots.repository";
import { z } from "zod";
import { slotsQuerySchema, slotsResponseSchema } from "@/schema/slots.schema";

import { PrismaClient } from "@calcom/prisma";

import { BaseService } from "../base.service";


export class SlotsService extends BaseService {
  private slotsRepository: SlotsRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.slotsRepository = new SlotsRepository(prisma);
  }

  async getAvailableSlots(params: z.infer<typeof slotsQuerySchema>) {
    return this.slotsRepository.getAvailableSlots(params);
  }
}
