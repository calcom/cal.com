import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { supabase } from "../../config/supabase";
import { API_VERSIONS_VALUES } from "../../lib/api-versions";
import { ApiAuthGuard } from "../../modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "../../modules/auth/guards/permissions/permissions.guard";
import { UpdateManagedUserInput } from "../../modules/users/inputs/update-managed-user.input";
import { GetMeOutput } from "./outputs/get-me.output";
import { UpdateMeOutput } from "./outputs/update-me.output";

@Controller({
  path: "/v2/me",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, PermissionsGuard)
@DocsTags("Me")
export class MeController {
  @Get("/:userId")
  @UseGuards(ApiAuthGuard)
  async getMe(@Param("userId") userId: string): Promise<GetMeOutput> {
    if (!userId) throw new InternalServerErrorException("User Id is required");

    const { data: user } = await supabase.from("users").select("*").eq("id", userId).limit(1).single();

    if (!user) throw new NotFoundException(`User with ID=${userId} does not exist.`);

    return {
      status: SUCCESS_STATUS,
      data: user,
    };
  }

  @Patch("/:userId")
  @UseGuards(ApiAuthGuard)
  async updateMe(
    @Param("userId") userId: string,
    @Body() bodySchedule: UpdateManagedUserInput
  ): Promise<UpdateMeOutput> {
    if (!userId) throw new InternalServerErrorException("User Id is required");

    const { data: user } = await supabase.from("users").select("id").eq("id", userId).limit(1).single();

    if (!user) throw new NotFoundException(`User with ID=${userId} does not exist.`);

    await supabase.from("users").update(bodySchedule).eq("id", userId).select("*");

    const { data: updatedUser } = await supabase.from("users").select("*").eq("id", userId).limit(1).single();

    return {
      status: SUCCESS_STATUS,
      data: updatedUser,
    };
  }
}
