import { Global, Module } from "@nestjs/common";

import { EmailsService } from "./emails.service";

@Global()
@Module({
  imports: [],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailModule {}
