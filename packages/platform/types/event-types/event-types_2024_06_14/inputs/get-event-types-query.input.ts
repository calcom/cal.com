import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class GetEventTypesQuery_2024_06_14 {
  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @IsOptional()
  eventSlug?: string;

  @IsOptional()
  @TransformUsernames()
  usernames?: string[];
}

export class GetTeamEventTypesQuery_2024_06_14 {
  @IsString()
  @IsOptional()
  eventSlug?: string;
}

function TransformUsernames() {
  return Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((username) => username.trim());
    }
    return value;
  });
}
