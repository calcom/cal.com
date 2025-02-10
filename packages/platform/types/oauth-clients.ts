import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
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

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value ?? false)
  @ApiPropertyOptional({
    type: Boolean,
    description:
      "By default false. If enabled, when creating a managed user the managed user will have 4 default event types: 30 and 60 minutes without Cal video, 30 and 60 minutes with Cal video. Leave this disabled if you want to create a managed user and then manually create event types for the user.",
  })
  areDefaultEventTypesEnabled = false;
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
