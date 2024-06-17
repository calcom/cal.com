import { Transform } from "class-transformer";
import { IsOptional, IsString, IsArray, ArrayNotEmpty } from "class-validator";

export class GetEventTypesQuery_2024_06_14 {
  @IsString()
  username?: string;

  @IsString()
  @IsOptional()
  eventSlug?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  @TransformUsernames()
  usernames?: string[];
}

function TransformUsernames() {
  return Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((username) => username.trim());
    }
    return value;
  });
}
