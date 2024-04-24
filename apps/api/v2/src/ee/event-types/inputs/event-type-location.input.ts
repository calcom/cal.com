import { ApiProperty as DocsProperty, ApiHideProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsBoolean, IsOptional, IsUrl } from "class-validator";

// note(Lauris): We will gradually expose more properties if any customer needs them.
// Just uncomment any below when requested.

export class EventTypeLocation {
  @IsString()
  @DocsProperty({ example: "link" })
  type!: string;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  address?: string;

  @IsOptional()
  @IsUrl()
  @DocsProperty({ example: "https://masterchief.com/argentina/flan/video/9129412" })
  link?: string;

  @IsOptional()
  @IsBoolean()
  @ApiHideProperty()
  displayLocationPublicly?: boolean;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  hostPhoneNumber?: string;

  @IsOptional()
  @IsNumber()
  @ApiHideProperty()
  credentialId?: number;

  @IsOptional()
  @IsString()
  @ApiHideProperty()
  teamName?: string;
}
