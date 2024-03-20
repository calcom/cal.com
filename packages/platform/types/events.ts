import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class GetPublicEventInput {
  @IsString()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  username!: string;

  @IsString()
  eventSlug!: string;

  @Transform(({ value }: { value: string }) => value === "true")
  @IsBoolean()
  @IsOptional()
  isTeamEvent?: boolean;

  @IsString()
  @IsOptional()
  org?: string;
}
