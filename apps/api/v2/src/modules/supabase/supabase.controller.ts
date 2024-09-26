import { Controller, Get, Param } from "@nestjs/common";

import { SupabaseService } from "./supabase.service";

@Controller("data")
export class SupabaseController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get(":table")
  async getData(@Param("table") table: string): Promise<any> {
    return this.supabaseService.getData(table);
  }
}
