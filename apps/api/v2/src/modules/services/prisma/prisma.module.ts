import { PrismaReadService } from "@/modules/services/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/services/prisma/prisma-write.service";
import { Module } from "@nestjs/common";

@Module({
  providers: [PrismaReadService, PrismaWriteService],
  exports: [PrismaReadService, PrismaWriteService],
})
export class PrismaModule {}
