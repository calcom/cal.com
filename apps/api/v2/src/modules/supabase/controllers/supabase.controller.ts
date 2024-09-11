import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { Controller, Get, Query, Type, UseGuards } from "@nestjs/common";
import { ApiProperty, ApiTags as DocsTags } from "@nestjs/swagger";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class GetSupabaseOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: Data,
  })
  @ValidateNested()
  @Type(() => Data)
  data!: any;
}

@Controller({
  path: "/v2/supabase",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, PermissionsGuard)
@DocsTags("Supabase")
export class SupabaseController {
  private readonly SUPABASE_URL = process.env.SUPABASE_URL!;
  private readonly SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

  @Get("/")
  async getHandler(@Query() scope: string): Promise<GetSupabaseOutput> {
    if (!scope) {
      return { data: null, status: ERROR_STATUS };
    }

    const supabaseResponse = await fetch(`${this.SUPABASE_URL}${scope}`, {
      headers: {
        apikey: this.SUPABASE_ANON_KEY,
      },
    });

    if (!supabaseResponse.ok) {
      return { data: null, status: ERROR_STATUS };
    }

    const data = await supabaseResponse.json();

    return { data, status: SUCCESS_STATUS };
  }
}
