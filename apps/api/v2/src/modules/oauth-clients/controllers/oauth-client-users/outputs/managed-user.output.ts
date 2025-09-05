import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { IsEnum, IsObject, IsOptional, IsUrl } from "class-validator";
import { Locales } from "@/lib/enums/locales";

export class ManagedUserOutput {
  @ApiProperty({ example: 1 })
  @Expose()
  id!: number;

  @ApiProperty({ example: "alice+cluo37fwd0001khkzqqynkpj3@example.com" })
  @Expose()
  email!: string;

  @ApiProperty({ example: "alice", nullable: true })
  @Expose()
  username!: string | null;

  @ApiProperty({ example: "alice", nullable: true })
  @Expose()
  name!: string | null;

  @ApiProperty({ example: "bio", nullable: true })
  @Expose()
  bio!: string | null;

  @ApiProperty({ example: "America/New_York" })
  @Expose()
  timeZone!: string;

  @ApiProperty({ example: "Sunday" })
  @Expose()
  weekStart!: string;

  @ApiProperty({ type: String, example: "2024-04-01T00:00:00.000Z" })
  @Transform(({ value }) => value.toISOString())
  @Expose()
  createdDate!: Date;

  @ApiProperty({ type: Number, example: 12, nullable: true })
  @Expose()
  timeFormat!: number | null;

  @ApiProperty({ type: Number, example: null, nullable: true })
  @Expose()
  defaultScheduleId!: number | null;

  @IsEnum(Locales)
  @IsOptional()
  @ApiPropertyOptional({ type: String, example: Locales.EN, enum: Locales })
  @Expose()
  locale?: Locales;

  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    example: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
    description: `URL of the user's avatar image`,
    nullable: true,
  })
  @Expose()
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    type: Object,
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @Expose()
  @Transform(
    // note(Lauris): added this transform because without it metadata is removed for some reason
    ({ obj }: { obj: { metadata: Record<string, unknown> | null | undefined } }) => {
      return obj.metadata || undefined;
    }
  )
  metadata?: Record<string, string | boolean | number>;
}
