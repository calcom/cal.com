import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class ManagedUserOutput {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "alice+cluo37fwd0001khkzqqynkpj3@example.com" })
  email!: string;

  @ApiProperty({ example: "alice" })
  username!: string | null;

  @ApiProperty({ example: "America/New_York" })
  timeZone!: string;

  @ApiProperty({ example: "Sunday" })
  weekStart!: string;

  @ApiProperty({ example: "2024-04-01T00:00:00.000Z", type: "string" })
  @Transform(({ value }) => value.toISOString())
  createdDate!: Date;

  @ApiProperty({ example: 12, nullable: true })
  timeFormat!: number | null;

  @ApiProperty({ example: null })
  defaultScheduleId!: number | null;
}
