import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsUserOOO } from "@/modules/ooo/guards/is-user-ooo";
import {
  CreateOutOfOfficeEntryDto,
  GetOutOfOfficeEntryFiltersDTO,
  UpdateOutOfOfficeEntryDto,
} from "@/modules/ooo/inputs/ooo.input";
import {
  UserOooOutputDto,
  UserOooOutputResponseDto,
  UserOoosOutputResponseDto,
} from "@/modules/ooo/outputs/ooo.output";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";

@Controller({
  path: "/v2/me/ooo",
  version: API_VERSIONS_VALUES,
})
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(ApiAuthGuard)
@DocsTags("Out of Office")
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class UserOOOController {
  constructor(private readonly userOOOService: UserOOOService) {}

  @Get("/")
  @ApiOperation({ summary: "Get all out-of-office entries for the authenticated user" })
  async getMyOOO(
    @GetUser("id") userId: number,
    @Query() query: GetOutOfOfficeEntryFiltersDTO
  ): Promise<UserOoosOutputResponseDto> {
    const { skip, take, ...rest } = query ?? { skip: 0, take: 250 };
    const ooos = await this.userOOOService.getUserOOOPaginated(userId, skip ?? 0, take ?? 250, rest);

    return {
      status: SUCCESS_STATUS,
      data: ooos.map((ooo) => plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" })),
    };
  }

  @Post("/")
  @ApiOperation({ summary: "Create an out-of-office entry for the authenticated user" })
  async createMyOOO(
    @GetUser("id") userId: number,
    @Body() input: CreateOutOfOfficeEntryDto
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.createUserOOO(userId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }

  @Patch("/:oooId")
  @UseGuards(IsUserOOO)
  @ApiOperation({ summary: "Update an out-of-office entry for the authenticated user" })
  async updateMyOOO(
    @GetUser("id") userId: number,
    @Param("oooId", ParseIntPipe) oooId: number,
    @Body() input: UpdateOutOfOfficeEntryDto
  ): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.updateUserOOO(userId, oooId, input);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }

  @Delete("/:oooId")
  @UseGuards(IsUserOOO)
  @ApiOperation({ summary: "Delete an out-of-office entry for the authenticated user" })
  async deleteMyOOO(@Param("oooId", ParseIntPipe) oooId: number): Promise<UserOooOutputResponseDto> {
    const ooo = await this.userOOOService.deleteUserOOO(oooId);
    return {
      status: SUCCESS_STATUS,
      data: plainToInstance(UserOooOutputDto, ooo, { strategy: "excludeAll" }),
    };
  }
}
