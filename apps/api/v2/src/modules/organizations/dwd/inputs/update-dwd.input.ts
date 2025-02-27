import {
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
  ServiceAccountKeyValidator,
} from "@/modules/organizations/dwd/inputs/service-account-key.input";
import { ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Expose, plainToClass, Transform, Type } from "class-transformer";
import { IsBoolean, IsOptional, Validate, ValidateNested } from "class-validator";

export class UpdateDwdInput {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  @Expose()
  enabled?: boolean;

  @IsOptional()
  @Validate(ServiceAccountKeyValidator)
  @ApiPropertyOptional({
    type: [GoogleServiceAccountKeyInput, MicrosoftServiceAccountKeyInput],
    oneOf: [
      { $ref: getSchemaPath(GoogleServiceAccountKeyInput) },
      { $ref: getSchemaPath(MicrosoftServiceAccountKeyInput) },
    ],
  })
  @Expose()
  @Type(() => Object)
  serviceAccountKey?: GoogleServiceAccountKeyInput | MicrosoftServiceAccountKeyInput;
}
