import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsNumber, IsOptional, IsBoolean, IsString } from "class-validator";
import { z } from "zod";

export class CreateOAuthClientInput {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  logo?: string;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  redirectUris!: string[];

  @IsNumber()
  @ApiProperty()
  permissions!: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  bookingRedirectUri?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  bookingCancelRedirectUri?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  bookingRescheduleRedirectUri?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  areEmailsEnabled?: boolean;
}

export class DeleteOAuthClientInput {
  @IsString()
  @ApiProperty()
  id!: string;
}

export const userSchemaResponse = z.object({
  id: z.number().int(),
  email: z.string(),
  timeFormat: z.number().int().default(12),
  defaultScheduleId: z.number().int().nullable(),
  weekStart: z.string(),
  timeZone: z.string().default("Europe/London"),
  username: z.string(),
  organizationId: z.number().nullable(),
  organization: z.object({ isPlatform: z.boolean(), id: z.number() }).optional(),
});

export type UserResponse = z.infer<typeof userSchemaResponse>;
