import { Expose } from "class-transformer";
import { IsInt } from "class-validator";

export class DeleteCalendarCredentialsInputBodyDto {
  @IsInt()
  @Expose()
  readonly id!: number;
}
