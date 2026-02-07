import { IsLocale, IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class GetCalendarLinksInput_2024_08_13 {
    @IsOptional()
    @IsString()
    @IsLocale()
    @ApiPropertyOptional({
        description: "Locale for the calendar links. Defaults to 'en' if not provided.",
        example: "en",
    })
    locale?: string;
}
