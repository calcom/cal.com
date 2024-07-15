import { IsInt, IsString } from "class-validator";

export class SelectedCalendarsInputDto {
  @IsString()
  readonly integration!: string;

  @IsString()
  readonly externalId!: string;

  @IsInt()
  readonly credentialId!: number;
}
