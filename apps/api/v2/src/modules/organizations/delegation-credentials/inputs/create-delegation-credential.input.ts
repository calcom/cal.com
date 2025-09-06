import {
  GoogleServiceAccountKeyInput,
  ServiceAccountKeyValidator,
  MicrosoftServiceAccountKeyInput,
} from "@/modules/organizations/delegation-credentials/inputs/service-account-key.input";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, IsNotEmpty, Validate } from "class-validator";

@ApiExtraModels(MicrosoftServiceAccountKeyInput, GoogleServiceAccountKeyInput)
export class CreateDelegationCredentialInput {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @Expose()
  workspacePlatformSlug!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @Expose()
  domain!: string;

  @Validate(ServiceAccountKeyValidator)
  @ApiProperty({
    type: [GoogleServiceAccountKeyInput, MicrosoftServiceAccountKeyInput],
    oneOf: [
      { $ref: getSchemaPath(GoogleServiceAccountKeyInput) },
      { $ref: getSchemaPath(MicrosoftServiceAccountKeyInput) },
    ],
  })
  @Expose()
  @Type(() => Object)
  serviceAccountKey!: (GoogleServiceAccountKeyInput | MicrosoftServiceAccountKeyInput) & {
    [key: string]: unknown;
  };
}
