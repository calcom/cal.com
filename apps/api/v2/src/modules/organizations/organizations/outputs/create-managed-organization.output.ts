import { ManagedOrganizationWithApiKeyOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class CreateManagedOrganizationOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: ManagedOrganizationWithApiKeyOutput })
  @Expose()
  @ValidateNested()
  @Type(() => ManagedOrganizationWithApiKeyOutput)
  data!: ManagedOrganizationWithApiKeyOutput;
}
