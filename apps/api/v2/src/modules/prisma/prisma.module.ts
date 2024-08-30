import { Module } from "@nestjs/common";
import { PrismaReadService } from "src/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "src/modules/prisma/prisma-write.service";

@Module({
  providers: [PrismaReadService, PrismaWriteService],
  exports: [PrismaReadService, PrismaWriteService],
})
export class PrismaModule {}
