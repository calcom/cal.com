import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { IsWorkflowInTeam } from "@/modules/auth/guards/workflows/is-workflow-in-team";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWorkflowDto } from "@/modules/workflows/inputs/create-workflow.input";
import { UpdateWorkflowDto } from "@/modules/workflows/inputs/update-workflow.input";
import { GetWorkflowOutput, GetWorkflowsOutput } from "@/modules/workflows/outputs/workflow.output";
import { TeamWorkflowsService } from "@/modules/workflows/services/team-workflows.service";
import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Body,
  Delete,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/workflows",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Orgs / Teams / Workflows")
@UseGuards(ApiAuthGuard, IsOrgGuard, IsTeamInOrg, PlatformPlanGuard, RolesGuard, IsAdminAPIEnabledGuard)
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationTeamWorkflowsController {
  constructor(private readonly workflowsService: TeamWorkflowsService) {}

  @Get("/")
  @ApiOperation({ summary: "Get organization team workflows" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("SCALE")
  async getWorkflows(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetWorkflowsOutput> {
    const { skip, take } = queryParams;

    const workflows = await this.workflowsService.getTeamWorkflows(teamId, skip, take);

    return { data: workflows, status: SUCCESS_STATUS };
  }

  @Get("/:workflowId")
  @UseGuards(IsWorkflowInTeam)
  @ApiOperation({ summary: "Get organization team workflow" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("SCALE")
  async getWorkflowById(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("workflowId", ParseIntPipe) workflowId: number
  ): Promise<GetWorkflowOutput> {
    const workflow = await this.workflowsService.getTeamWorkflowById(teamId, workflowId);

    return { data: workflow, status: SUCCESS_STATUS };
  }

  @Post("/")
  @ApiOperation({ summary: "Create organization team workflow" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("SCALE")
  async createWorkflow(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() data: CreateWorkflowDto
  ): Promise<GetWorkflowOutput> {
    const workflow = await this.workflowsService.createTeamWorkflow(user, teamId, data);
    return { data: workflow, status: SUCCESS_STATUS };
  }

  @Patch("/:workflowId")
  @UseGuards(IsWorkflowInTeam)
  @ApiOperation({ summary: "Update organization team workflow" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("SCALE")
  async updateWorkflow(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("workflowId", ParseIntPipe) workflowId: number,
    @GetUser() user: UserWithProfile,
    @Body() data: UpdateWorkflowDto
  ): Promise<GetWorkflowOutput> {
    const workflow = await this.workflowsService.updateTeamWorkflow(user, teamId, workflowId, data);
    return { data: workflow, status: SUCCESS_STATUS };
  }

  @Delete("/:workflowId")
  @UseGuards(IsWorkflowInTeam)
  @ApiOperation({ summary: "Delete organization team workflow" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("SCALE")
  async deleteWorkflow(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("workflowId") workflowId: number
  ): Promise<{ status: typeof SUCCESS_STATUS }> {
    await this.workflowsService.deleteTeamWorkflow(teamId, workflowId);
    return { status: SUCCESS_STATUS };
  }
}
