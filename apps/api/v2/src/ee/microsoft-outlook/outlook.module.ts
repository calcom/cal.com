import { MicrosoftOutlookService } from "@/ee/microsoft-outlook/outlook.service";
import { Module } from "@nestjs/common";

@Module({
  exports: [MicrosoftOutlookService],
})
export class MicrosoftOutlookModule {}
