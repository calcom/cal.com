import { Transform } from "class-transformer";
import { IsBoolean, IsString } from "class-validator";

export class GetPublicEventInput {
  @IsString()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  username!: string;

  @IsString()
  eventSlug!: string;

  @IsBoolean()
  isTeamEvent?: boolean;

  @IsString()
  org!: string | null;
}
