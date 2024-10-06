import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { Controller, Get, Param, UseGuards, Version, VERSION_NEUTRAL } from "@nestjs/common";

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_URL = process.env.SUPABASE_ANON_KEY!;

@Controller()
export class AppController {
  @Get("health")
  @Version(VERSION_NEUTRAL)
  getHealth(): "OK" {
    return "OK";
  }

  @Get("/supabase")
  @UseGuards(ApiAuthGuard)
  @Version(VERSION_NEUTRAL)
  async getSupabase(@Param("scope") scope: string): Promise<any> {
    const supabaseResponse = await fetch(`${SUPABASE_URL}/${scope}?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    });

    return await supabaseResponse.json();
  }

  @Get()
  @Version(VERSION_NEUTRAL)
  getRoot(): string {
    return `{"message":"Welcome to Cal.com API V2 - docs are at https://developer.cal.com/api}`;
  }
}
