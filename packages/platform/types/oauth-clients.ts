import { IsArray, IsNumber, IsOptional, IsBoolean, IsString } from "class-validator";
import { z } from "zod";

export class CreateOAuthClientInput {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  redirectUris!: string[];

  @IsNumber()
  permissions!: number;

  @IsOptional()
  @IsString()
  bookingRedirectUri?: string;

  @IsOptional()
  @IsString()
  bookingCancelRedirectUri?: string;

  @IsOptional()
  @IsString()
  bookingRescheduleRedirectUri?: string;

  @IsOptional()
  @IsBoolean()
  areEmailsEnabled?: boolean;
}

export class DeleteOAuthClientInput {
  @IsString()
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
});

export type UserResponse = z.infer<typeof userSchemaResponse>;
