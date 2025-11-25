import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class CountryCodeData {
  @IsString()
  @ApiProperty({ example: "US" })
  countryCode!: string;
}

export class GetCountryCodeResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => CountryCodeData)
  data!: CountryCodeData;
}
