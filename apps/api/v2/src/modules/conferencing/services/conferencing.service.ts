import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.respository";
import { Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ConferencingService {
  private logger = new Logger("ConferencingService");

  constructor(private readonly conferencingRepository: ConferencingRepository) {}

  async getConferencingApps(userId: number) {
    return this.conferencingRepository.findConferencingApps(userId);
  }
}
