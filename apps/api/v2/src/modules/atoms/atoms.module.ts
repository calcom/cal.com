import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [AtomsRepository],
  exports: [AtomsRepository],
})
export class AtomsModule {}
