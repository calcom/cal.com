import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class GetPublicEventInput {
  @IsString()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  @ApiProperty({ required: true })
  username!: string;

  @IsString()
  @ApiProperty({ required: true })
  eventSlug!: string;

  @Transform(({ value }: { value: string }) => value === "true")
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  isTeamEvent?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  org?: string;
}
