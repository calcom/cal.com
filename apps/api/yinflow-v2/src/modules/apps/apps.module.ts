import { Module } from "@nestjs/common";

import { AppsRepository } from "../apps/apps.repository";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { SelectedCalendarsRepository } from "../selected-calendars/selected-calendars.repository";
import { TokensModule } from "../tokens/tokens.module";

@Module({
  imports: [TokensModule],
  providers: [AppsRepository, CredentialsRepository, SelectedCalendarsRepository],
  exports: [],
})
export class AppsModule {}
