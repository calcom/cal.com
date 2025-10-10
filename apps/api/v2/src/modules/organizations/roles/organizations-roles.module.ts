import { Module } from "@nestjs/common";

import { OrganizationsRolesController } from "./controllers/organizations-roles.controller";
import { OrganizationsRolesOutputService } from "./services/organizations-roles-output.service";
import { OrganizationsRolesService } from "./services/organizations-roles.service";

@Module({
  imports: [],
  providers: [OrganizationsRolesService, OrganizationsRolesOutputService],
  controllers: [OrganizationsRolesController],
  exports: [OrganizationsRolesService],
})
export class OrganizationsRolesModule {}
