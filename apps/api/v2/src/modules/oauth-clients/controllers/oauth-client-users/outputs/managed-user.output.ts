import { Locales } from "@/lib/enums/locales";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsUrl } from "class-validator";

export class ManagedUserOutput {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "alice+cluo37fwd0001khkzqqynkpj3@example.com" })
  email!: string;

  @ApiProperty({ example: "alice", nullable: true })
  username!: string | null;

  @ApiProperty({ example: "alice", nullable: true })
  name!: string | null;

  @ApiProperty({ example: "America/New_York" })
  timeZone!: string;

  @ApiProperty({ example: "Sunday" })
  weekStart!: string;

  @ApiProperty({ type: String, example: "2024-04-01T00:00:00.000Z" })
  @Transform(({ value }) => value.toISOString())
  createdDate!: Date;

  @ApiProperty({ type: Number, example: 12, nullable: true })
  timeFormat!: number | null;

  @ApiProperty({ type: Number, example: null, nullable: true })
  defaultScheduleId!: number | null;

  @IsEnum(Locales)
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: Locales.EN, enum: Locales })
  locale?: Locales;

  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    example: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
    description: `URL of the user's avatar image`,
    nullable: true,
  })
  avatarUrl?: string | null;
}
