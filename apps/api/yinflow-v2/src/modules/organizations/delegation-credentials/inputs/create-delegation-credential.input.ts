import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsNotEmpty, IsString, Validate } from "class-validator";

import {
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
  ServiceAccountKeyValidator,
} from "../../../organizations/delegation-credentials/inputs/service-account-key.input";

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
  serviceAccountKey!: GoogleServiceAccountKeyInput | MicrosoftServiceAccountKeyInput;
}
