import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class BaseApiResponseDto<T> {
  @ApiProperty({ example: "success" })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: "The payload of the response, which can be any type of data.",
  })
  data: T;

  constructor(status: string, data: T) {
    this.status = status;
    this.data = data;
  }
}

export class OAuthClientDto {
  @ApiProperty({ example: "abc123" })
  @IsString()
  clientId!: string;

  @ApiProperty({ example: "secretKey123" })
  @IsString()
  clientSecret!: string;
}
