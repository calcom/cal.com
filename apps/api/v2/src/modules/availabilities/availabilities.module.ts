import { AvailabilitiesService } from "@/modules/availabilities/availabilities.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [AvailabilitiesService],
  exports: [AvailabilitiesService],
})
export class AvailabilitiesModule {}
