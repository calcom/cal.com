import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum } from "class-validator";

import { Locales } from "@/lib/enums/locales";

export class GetCalendarLinksInput_2024_08_13 {
    @IsOptional()
    @IsEnum(Locales)
    @ApiPropertyOptional({
        description:
            "Locale for calendar link event names. Defaults to 'en' if not provided. Supported values include: ar, ca, de, en, es, fr, it, ja, ko, nl, pt, ru, zh-CN, etc.",
        enum: Locales,
        example: Locales.EN,
    })
    locale?: Locales;
}
