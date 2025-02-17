import {
  GoogleServiceAccountKeyInput,
  ServiceAccountKeyValidator,
  MicrosoftServiceAccountKeyInput,
} from "@/modules/organizations/dwd/inputs/service-account-key.input";
import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString, IsNotEmpty, ValidateNested, Validate } from "class-validator";

export class CreateDwdInput {
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

  @ValidateNested()
  @ApiProperty({
    type: [GoogleServiceAccountKeyInput, MicrosoftServiceAccountKeyInput],
    oneOf: [
      { $ref: getSchemaPath(GoogleServiceAccountKeyInput) },
      { $ref: getSchemaPath(MicrosoftServiceAccountKeyInput) },
    ],
  })
  @Expose()
  @Validate(ServiceAccountKeyValidator)
  serviceAccountKey!: GoogleServiceAccountKeyInput | MicrosoftServiceAccountKeyInput;
}
