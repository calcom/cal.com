import { ApiPropertyOptional, ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from "class-validator";

export enum TemplateType {
  CHECK_IN_APPOINTMENT = "CHECK_IN_APPOINTMENT",
  CUSTOM_TEMPLATE = "CUSTOM_TEMPLATE",
}

export class CreatePhoneCallInput {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      "Invalid phone number format. Expected format: +<CountryCode><PhoneNumber> with no spaces or separators.",
  })
  @DocsProperty({ description: "Your phone number" })
  yourPhoneNumber!: string;

  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      "Invalid phone number format. Expected format: +<CountryCode><PhoneNumber> with no spaces or separators.",
  })
  @DocsProperty({ description: "Number to call" })
  numberToCall!: string;

  @IsString()
  @DocsProperty({ description: "CAL API Key" })
  calApiKey!: string;

  @IsBoolean()
  @DocsProperty({ description: "Enabled status", default: true })
  enabled = true;

  @IsEnum(TemplateType)
  @DocsProperty({ description: "Template type", enum: TemplateType })
  templateType: TemplateType = TemplateType.CUSTOM_TEMPLATE;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "Scheduler name" })
  schedulerName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? value : undefined))
  @ApiPropertyOptional({ description: "Guest name" })
  guestName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? value : undefined))
  @ApiPropertyOptional({ description: "Guest email" })
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? value : undefined))
  @ApiPropertyOptional({ description: "Guest company" })
  guestCompany?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "Begin message" })
  beginMessage?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: "General prompt" })
  generalPrompt?: string;
}
