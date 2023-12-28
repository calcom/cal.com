import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AtomsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}
}
