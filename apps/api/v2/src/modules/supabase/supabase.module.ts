import { Module } from "@nestjs/common";
import { SupabaseController } from "src/modules/supabase/controllers/supabase.controller";

@Module({
  controllers: [SupabaseController],
})
export class SupabaseModule {}
