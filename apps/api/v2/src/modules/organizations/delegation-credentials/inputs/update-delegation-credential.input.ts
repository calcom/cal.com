import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsOptional, Validate } from "class-validator";
import {
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
  ServiceAccountKeyValidator,
} from "@/modules/organizations/delegation-credentials/inputs/service-account-key.input";

@ApiExtraModels(GoogleServiceAccountKeyInput, MicrosoftServiceAccountKeyInput)
export class UpdateDelegationCredentialInput {
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
