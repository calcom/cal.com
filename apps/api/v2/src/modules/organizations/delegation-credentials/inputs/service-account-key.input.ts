import { ApiProperty } from "@nestjs/swagger";
import { Expose, plainToClass, Type } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  validateSync,
} from "class-validator";

export class MicrosoftServiceAccountKeyInput {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  private_key!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  tenant_id!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  client_id!: string;
}

export class GoogleServiceAccountKeyInput {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  private_key!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  client_email!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  client_id!: string;
}

@ValidatorConstraint({ name: "isServiceAccountKey", async: false })
export class ServiceAccountKeyValidator implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!value || typeof value !== "object") return false;

    if ("client_email" in value) {
      const googleKey = plainToClass(GoogleServiceAccountKeyInput, value, {
        excludeExtraneousValues: true,
      });
      const googleErrors = validateSync(googleKey, {
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: false,
      });

      if (googleErrors.length === 0) return true;
      this.errors = googleErrors;
      return false;
    }

    if ("tenant_id" in value) {
      const msKey = plainToClass(MicrosoftServiceAccountKeyInput, value, {
        excludeExtraneousValues: true,
      });
      const msErrors = validateSync(msKey, {
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: false,
      });

      if (msErrors.length === 0) return true;
      this.errors = msErrors;
      return false;
    }

    return false;
  }

  private errors?: any[];

  defaultMessage() {
    if (this.errors?.length) {
      return this.errors.map((error) => Object.values(error.constraints || {}).join(", ")).join("; ");
    }

    return "Service account key must be either a Google service account key (with client_email, private_key, client_id) or Microsoft service account key (with tenant_id, private_key, client_id)";
  }
}
