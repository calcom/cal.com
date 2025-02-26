import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class ApiKeyOutput {
  @IsString()
  @Expose()
  @DocsProperty()
  readonly apiKey!: string;
}
