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
import { IsEventTypeWorkflowInTeam } from "@/modules/auth/guards/workflows/is-event-type-workflow-in-team";
import { IsRoutingFormWorkflowInTeam } from "@/modules/auth/guards/workflows/is-routing-form-workflow-in-team";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateEventTypeWorkflowDto } from "@/modules/workflows/inputs/create-event-type-workflow.input";
import { CreateFormWorkflowDto } from "@/modules/workflows/inputs/create-form-workflow";
import { UpdateEventTypeWorkflowDto } from "@/modules/workflows/inputs/update-event-type-workflow.input";
import { UpdateFormWorkflowDto } from "@/modules/workflows/inputs/update-form-workflow.input";
import {
    GetEventTypeWorkflowOutput,
    GetEventTypeWorkflowsOutput,
} from "@/modules/workflows/outputs/event-type-workflow.output";
import {
    GetRoutingFormWorkflowOutput,
    GetRoutingFormWorkflowsOutput,
} from "@/modules/workflows/outputs/routing-form-workflow.output";
import { TeamEventTypeWorkflowsService } from "@/modules/workflows/services/team-event-type-workflows.service";
import { TeamRoutingFormWorkflowsService } from "@/modules/workflows/services/team-routing-form-workflows.service";
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
    path: "/v2/organizations/:orgId/workflows",
    version: API_VERSIONS_VALUES,
})
@ApiTags("Orgs / Workflows")
@UseGuards(ApiAuthGuard, IsOrgGuard, PlatformPlanGuard, RolesGuard, IsAdminAPIEnabledGuard)
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsWorkflowsController {
    constructor(
        private readonly eventTypeWorkflowsService: TeamEventTypeWorkflowsService,
        private readonly routingFormWorkflowsService: TeamRoutingFormWorkflowsService
    ) { }

    @Get("/")
    @ApiOperation({ summary: "Get organization workflows" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async getWorkflows(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Query() queryParams: SkipTakePagination
    ): Promise<GetEventTypeWorkflowsOutput> {
        const { skip, take } = queryParams;
        const workflows = await this.eventTypeWorkflowsService.getEventTypeTeamWorkflows(orgId, skip, take);

        return { data: workflows, status: SUCCESS_STATUS };
    }

    @Get("/routing-form")
    @ApiOperation({ summary: "Get organization routing-form workflows" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async getRoutingFormWorkflows(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Query() queryParams: SkipTakePagination
    ): Promise<GetRoutingFormWorkflowsOutput> {
        const { skip, take } = queryParams;
        const workflows = await this.routingFormWorkflowsService.getRoutingFormTeamWorkflows(orgId, skip, take);

        return { data: workflows, status: SUCCESS_STATUS };
    }

    @Get("/:workflowId")
    @UseGuards(IsEventTypeWorkflowInTeam)
    @ApiOperation({ summary: "Get organization workflow" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async getWorkflowById(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Param("workflowId", ParseIntPipe) workflowId: number
    ): Promise<GetEventTypeWorkflowOutput> {
        const workflow = await this.eventTypeWorkflowsService.getEventTypeTeamWorkflowById(orgId, workflowId);

        return { data: workflow, status: SUCCESS_STATUS };
    }

    @Get("/:workflowId/routing-form")
    @UseGuards(IsRoutingFormWorkflowInTeam)
    @ApiOperation({ summary: "Get organization routing-form workflow" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async getRoutingFormWorkflowById(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Param("workflowId", ParseIntPipe) workflowId: number
    ): Promise<GetRoutingFormWorkflowOutput> {
        const workflow = await this.routingFormWorkflowsService.getRoutingFormTeamWorkflowById(orgId, workflowId);
        return { data: workflow, status: SUCCESS_STATUS };
    }

    @Post("/")
    @ApiOperation({ summary: "Create organization workflow for event-types" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async createEventTypeWorkflow(
        @GetUser() user: UserWithProfile,
        @Param("orgId", ParseIntPipe) orgId: number,
        @Body() data: CreateEventTypeWorkflowDto
    ): Promise<GetEventTypeWorkflowOutput> {
        const workflow = await this.eventTypeWorkflowsService.createEventTypeTeamWorkflow(user, orgId, data);
        return { data: workflow, status: SUCCESS_STATUS };
    }

    @Post("/routing-form")
    @ApiOperation({ summary: "Create organization routing-form workflow" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async createRoutingFormWorkflow(
        @GetUser() user: UserWithProfile,
        @Param("orgId", ParseIntPipe) orgId: number,
        @Body() data: CreateFormWorkflowDto
    ): Promise<GetRoutingFormWorkflowOutput> {
        const workflow = await this.routingFormWorkflowsService.createFormTeamWorkflow(user, orgId, data);
        return { data: workflow, status: SUCCESS_STATUS };
    }

    @Patch("/:workflowId")
    @UseGuards(IsEventTypeWorkflowInTeam)
    @ApiOperation({ summary: "Update organization workflow" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async updateWorkflow(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Param("workflowId", ParseIntPipe) workflowId: number,
        @GetUser() user: UserWithProfile,
        @Body() data: UpdateEventTypeWorkflowDto
    ): Promise<GetEventTypeWorkflowOutput> {
        const workflow = await this.eventTypeWorkflowsService.updateEventTypeTeamWorkflow(user, orgId, workflowId, data);
        return { data: workflow, status: SUCCESS_STATUS };
    }

    @Patch("/:workflowId/routing-form")
    @UseGuards(IsRoutingFormWorkflowInTeam)
    @ApiOperation({ summary: "Update organization routing-form workflow" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async updateRoutingFormWorkflow(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Param("workflowId", ParseIntPipe) workflowId: number,
        @GetUser() user: UserWithProfile,
        @Body() data: UpdateFormWorkflowDto
    ): Promise<GetRoutingFormWorkflowOutput> {
        const workflow = await this.routingFormWorkflowsService.updateFormTeamWorkflow(user, orgId, workflowId, data);
        return { data: workflow, status: SUCCESS_STATUS };
    }

    @Delete("/:workflowId")
    @UseGuards(IsEventTypeWorkflowInTeam)
    @ApiOperation({ summary: "Delete organization workflow" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async deleteWorkflow(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Param("workflowId", ParseIntPipe) workflowId: number
    ): Promise<{ status: typeof SUCCESS_STATUS }> {
        await this.eventTypeWorkflowsService.deleteTeamEventTypeWorkflow(orgId, workflowId);
        return { status: SUCCESS_STATUS };
    }

    @Delete("/:workflowId/routing-form")
    @UseGuards(IsRoutingFormWorkflowInTeam)
    @ApiOperation({ summary: "Delete organization routing-form workflow" })
    @Roles("ORG_ADMIN")
    @PlatformPlan("SCALE")
    async deleteRoutingFormWorkflow(
        @Param("orgId", ParseIntPipe) orgId: number,
        @Param("workflowId", ParseIntPipe) workflowId: number
    ): Promise<{ status: typeof SUCCESS_STATUS }> {
        await this.routingFormWorkflowsService.deleteTeamRoutingFormWorkflow(orgId, workflowId);
        return { status: SUCCESS_STATUS };
    }
}

