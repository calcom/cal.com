import { Module } from "@nestjs/common";

import { SupabaseController } from "./supabase.controller";
import { SupabaseService } from "./supabase.service";

@Module({
  controllers: [SupabaseController],
  providers: [SupabaseService],
})
export class SupabaseModule {}
